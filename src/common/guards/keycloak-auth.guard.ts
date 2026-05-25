import {
	CanActivate,
	ExecutionContext,
	Injectable,
	InternalServerErrorException,
	Logger,
	UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type {
	AuthenticatedRequest,
	AuthenticatedUser,
} from '../types/authenticated-request';

interface KeycloakRealmResponse {
	public_key?: string;
}

interface KeycloakTokenPayload {
	sub: string;
	preferred_username?: string;
	email?: string;
	realm_access?: { roles?: string[] };
}

/**
 * KeycloakAuthGuard: extrae el Bearer token del header Authorization y lo valida
 * verificando su firma RS256 contra la clave pública del realm de Keycloak.
 *
 * La clave pública se obtiene de Keycloak una sola vez y se cachea 10 minutos,
 * evitando una llamada de red en cada petición (patrón offline/JWT).
 *
 * Rutas marcadas con @Public() se omiten.
 */
@Injectable()
export class KeycloakAuthGuard implements CanActivate {
	private readonly logger = new Logger(KeycloakAuthGuard.name);
	private readonly realmUrl: string;

	// Caché de la clave pública
	private cachedPublicKey?: string;
	private cachedAt = 0;
	private readonly CACHE_TTL_MS = 10 * 60_000; // 10 minutos

	constructor(
		private readonly reflector: Reflector,
		config: ConfigService,
	) {
		const baseUrl = config.getOrThrow<string>('KEYCLOAK_BASE_URL');
		const realm = config.getOrThrow<string>('KEYCLOAK_REALM');
		this.realmUrl = `${baseUrl.replace(/\/+$/, '')}/realms/${encodeURIComponent(realm)}`;
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) {
			return true;
		}

		const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
		const token = this.extractBearerToken(request.headers.authorization);
		if (!token) {
			throw new UnauthorizedException('Token Bearer no proporcionado');
		}

		const publicKey = await this.getPublicKey();

		let payload: KeycloakTokenPayload;
		try {
			payload = jwt.verify(token, publicKey, {
				algorithms: ['RS256'],
			}) as KeycloakTokenPayload;
		} catch {
			throw new UnauthorizedException('Token inválido o expirado');
		}

		if (!payload.sub) {
			throw new UnauthorizedException('Token sin identificador de usuario');
		}

		const user: AuthenticatedUser = {
			sub: payload.sub,
			username: payload.preferred_username,
			email: payload.email,
			roles: payload.realm_access?.roles ?? [],
		};

		request.user = user;
		return true;
	}

	private extractBearerToken(header?: string): string | null {
		if (!header) return null;
		const [scheme, value] = header.split(' ');
		if (scheme?.toLowerCase() !== 'bearer' || !value?.trim()) {
			return null;
		}
		return value.trim();
	}

	/**
	 * Obtiene la clave pública RS256 del realm de Keycloak.
	 * Se cachea durante CACHE_TTL_MS para evitar llamadas repetidas.
	 */
	private async getPublicKey(): Promise<string> {
		if (this.cachedPublicKey && Date.now() - this.cachedAt < this.CACHE_TTL_MS) {
			return this.cachedPublicKey;
		}

		let response: Response;
		try {
			response = await fetch(this.realmUrl);
		} catch (error) {
			this.logger.error('Error consultando clave pública de Keycloak', error);
			throw new InternalServerErrorException('No se pudo obtener la clave pública de Keycloak');
		}

		if (!response.ok) {
			this.logger.error(`Keycloak devolvió ${response.status} al consultar el realm`);
			throw new InternalServerErrorException('No se pudo obtener la clave pública de Keycloak');
		}

		const json = (await response.json()) as KeycloakRealmResponse;
		if (!json?.public_key) {
			this.logger.error('Keycloak no devolvió public_key en el endpoint del realm');
			throw new InternalServerErrorException('Respuesta inválida de Keycloak');
		}

		this.cachedPublicKey = this.formatPublicKey(json.public_key);
		this.cachedAt = Date.now();
		this.logger.log('Clave pública de Keycloak cacheada correctamente');
		return this.cachedPublicKey;
	}

	private formatPublicKey(rawKey: string): string {
		const normalized = rawKey.replace(/\s+/g, '');
		const chunks = normalized.match(/.{1,64}/g) ?? [normalized];
		return ['-----BEGIN PUBLIC KEY-----', ...chunks, '-----END PUBLIC KEY-----'].join('\n');
	}
}
