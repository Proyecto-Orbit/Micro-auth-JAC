import {
	CanActivate,
	ExecutionContext,
	Injectable,
	InternalServerErrorException,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AUTH_COOKIE_NAME } from '../constants/auth.constants';

/**
 * JwtPayload: Define la estructura de los datos esperados en el token JWT.
 * - sub: Identificador único del usuario (ID de Google).
 * - email: Correo electrónico del usuario.
 * - nombre: Nombre del usuario.
 * - rol: Rol asignado al usuario.
 */
type JwtPayload = {
	/*
	El campo 'sub' es un identificador único del usuario, comúnmente el ID de la cuenta de Google.
	*/
	sub: string;
	email: string;
	nombre: string;
	rol: string;
};

/**
 * AuthenticatedRequest: Extiende la interfaz Request de Express para incluir el usuario autenticado.
 * - user: Contiene los datos del usuario autenticado (JwtPayload).
 */
type AuthenticatedRequest = Request & { user?: JwtPayload };

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly jwtService: JwtService,
	) {}
	/**
	 * Método principal del guardia de autenticación JWT.
	 * - Verifica si la ruta es pública.
	 * - Extrae y valida el token JWT.
	 * - Adjunta los datos del usuario autenticado a la solicitud.
	 * @param context Contexto de ejecución de la solicitud.
	 * @returns {Promise<boolean>} Retorna true si la autenticación es válida o la ruta es pública.
	 * @throws {UnauthorizedException} Si el token no es proporcionado o es inválido.
	 * @throws {InternalServerErrorException} Si no está configurada la clave secreta JWT.
	 */
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			return true;
		}

		const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
		const authHeader = request.headers.authorization;
		// Extracción de cookie
		const cookieToken = request.cookies?.[AUTH_COOKIE_NAME] as
			| string
			| undefined;
		const token = this.extractToken(authHeader, cookieToken);

		if (!token) {
			throw new UnauthorizedException('Token JWT no proporcionado');
		}

		const jwtSecret = process.env.JWT_SECRET?.trim();
		if (!jwtSecret) {
			throw new InternalServerErrorException('Error interno del servidor');
		}

		try {
			request.user = await this.jwtService.verifyAsync<JwtPayload>(token, {
				secret: jwtSecret,
			});
			return true;
		} catch {
			throw new UnauthorizedException('Token JWT inválido o expirado');
		}
	}

	/**
	 * Método para extraer el token JWT.
	 * - Prioriza el token en la cabecera Authorization si está presente.
	 * - Utiliza el token de la cookie si no hay cabecera Authorization.
	 * @param authHeader Cabecera Authorization de la solicitud.
	 * @param cookieToken Token JWT almacenado en la cookie.
	 * @returns {string | null} Retorna el token JWT o null si no se encuentra.
	 */
	private extractToken(authHeader?: string, cookieToken?: string): string | null {
		if (authHeader) {
			const [type, token] = authHeader.split(' ');
			if (type === 'Bearer' && token) {
				return token;
			}
		}

		if (cookieToken?.trim()) {
			return cookieToken.trim();
		}

		return null;
	}
}
