import {
	CanActivate,
	ExecutionContext,
	Injectable,
	Logger,
	UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import axios, { AxiosError } from 'axios';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { KeycloakAdminService } from '../../modules/keycloak/keycloak-admin.service';
import type {
	AuthenticatedRequest,
	AuthenticatedUser,
} from '../types/authenticated-request';

type IntrospectionResponse = {
	active: boolean;
	sub?: string;
	username?: string;
	preferred_username?: string;
	email?: string;
	realm_access?: { roles?: string[] };
};

/**
 * KeycloakAuthGuard: extrae el Bearer token del header Authorization y lo valida
 * contra el endpoint de introspeccion de Keycloak. Si es valido, deja el usuario
 * y sus roles disponibles en `request.user`.
 *
 * Rutas marcadas con @Public() se omiten.
 */
@Injectable()
export class KeycloakAuthGuard implements CanActivate {
	private readonly logger = new Logger(KeycloakAuthGuard.name);
	private readonly introspectUrl: string;
	private readonly clientId: string;
	private readonly clientSecret: string;

	constructor(
		private readonly reflector: Reflector,
		config: ConfigService,
		private readonly keycloak: KeycloakAdminService,
	) {
		const baseUrl = config.getOrThrow<string>('KEYCLOAK_BASE_URL');
		const realm = config.getOrThrow<string>('KEYCLOAK_REALM');
		this.introspectUrl = `${baseUrl}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token/introspect`;
		this.clientId = config.getOrThrow<string>('KEYCLOAK_ADMIN_CLIENT_ID');
		this.clientSecret = config.getOrThrow<string>('KEYCLOAK_ADMIN_CLIENT_SECRET');
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

		const introspection = await this.introspect(token);
		if (!introspection.active || !introspection.sub) {
			throw new UnauthorizedException('Token invalido o expirado');
		}

		const user: AuthenticatedUser = {
			sub: introspection.sub,
			username: introspection.preferred_username ?? introspection.username,
			email: introspection.email,
			roles: introspection.realm_access?.roles ?? [],
		};

		request.user = user;
		// Conservamos el token para que servicios downstream lo puedan reutilizar si lo necesitan.
		void this.keycloak;
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

	private async introspect(token: string): Promise<IntrospectionResponse> {
		const params = new URLSearchParams({
			token,
			client_id: this.clientId,
			client_secret: this.clientSecret,
		});

		try {
			const { data, status } = await axios.post<IntrospectionResponse>(
				this.introspectUrl,
				params.toString(),
				{
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					validateStatus: () => true,
				},
			);

			if (status !== 200 || !data) {
				this.logger.warn(`Introspeccion respondio ${status}`);
				throw new UnauthorizedException('No fue posible validar el token');
			}

			return data;
		} catch (error) {
			if (error instanceof UnauthorizedException) throw error;
			const detail =
				error instanceof AxiosError
					? error.message
					: 'Error desconocido en introspeccion';
			this.logger.error(`Fallo introspeccion: ${detail}`);
			throw new UnauthorizedException('No fue posible validar el token');
		}
	}
}
