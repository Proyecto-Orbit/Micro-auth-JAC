import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../types/authenticated-request';

/**
 * RolesGuard: verifica que el usuario autenticado tenga al menos uno de los roles
 * requeridos por @Roles(...). Si no hay @Roles en el handler, no se imponen restricciones
 * adicionales (basta con estar autenticado).
 */
@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) return true;

		const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (!requiredRoles?.length) return true;

		const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
		const userRoles = request.user?.roles;

		if (!userRoles?.length) {
			throw new UnauthorizedException('Usuario no autenticado');
		}

		const hasRole = requiredRoles.some((role) => userRoles.includes(role));
		if (!hasRole) {
			throw new ForbiddenException('No tienes permisos para realizar esta accion');
		}

		return true;
	}
}
