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

type AuthenticatedRequest = Request & {
	user?: {
		rol?: string;
	};
};

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

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

		if (role !== 'admin') {
			throw new ForbiddenException('Solo los usuarios administradores pueden operar');
		}

		return true;
	}
}
