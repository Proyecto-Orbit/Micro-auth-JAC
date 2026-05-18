import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, AuthenticatedUser } from '../types/authenticated-request';

/**
 * AuthUser: parametro decorator que devuelve el usuario autenticado adjuntado por el guard.
 */
export const AuthUser = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
		const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
		if (!req.user) {
			throw new Error('AuthUser usado en una ruta sin KeycloakAuthGuard');
		}
		return req.user;
	},
);
