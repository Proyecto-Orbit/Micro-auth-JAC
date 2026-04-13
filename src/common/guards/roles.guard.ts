import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * AuthenticatedRequest: Extiende la interfaz Request de Express para incluir el usuario autenticado.
 * - user: Contiene los datos del usuario autenticado (JwtPayload).
 */
type AuthenticatedRequest = Request & {
	user?: {
		rol?: string;
	};
};

/**
 * RolesGuard: Guardia para controlar el acceso basado en roles de usuario.
 * - Permite acceso a rutas públicas sin restricciones.
 * - Restringe el acceso a usuarios con rol distinto de 'admin'.
 */

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	/**
	 * Método principal del guardia de roles.
	 * - Verifica si la ruta es pública.
	 * - Extrae el rol del usuario autenticado.
	 * - Lanza excepciones si el usuario no está autenticado o no tiene el rol adecuado.
	 * @param context Contexto de ejecución de la solicitud.
	 * @returns {boolean} Retorna true si el usuario tiene acceso permitido.
	 * @throws {UnauthorizedException} Si el usuario no está autenticado.
	 * @throws {ForbiddenException} Si el usuario no tiene el rol adecuado.
	 */
	canActivate(context: ExecutionContext): boolean {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			return true;
		}

		const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
		const role = request.user?.rol;

		if (!role) {
			throw new UnauthorizedException('Usuario no autenticado');
		}

		const rolesPermitidos: string[] = ['admin', 'operador'];
		if (!rolesPermitidos.includes(role)) {
			throw new ForbiddenException('No tienes permisos para realizar esta acción');
		}

		return true;
	}
}
