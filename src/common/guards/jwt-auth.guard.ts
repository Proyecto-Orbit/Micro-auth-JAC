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

type JwtPayload = {
	sub: string;
	email: string;
	nombre: string;
	rol: string;
};

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly jwtService: JwtService,
	) {}

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
		const token = this.extractToken(authHeader);

		if (!token) {
			throw new UnauthorizedException('Token JWT no proporcionado');
		}

		const jwtSecret = process.env.JWT_SECRET?.trim();
		if (!jwtSecret) {
			throw new InternalServerErrorException('JWT_SECRET no está configurado');
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

	private extractToken(authHeader?: string): string | null {
		if (!authHeader) {
			return null;
		}

		const [type, token] = authHeader.split(' ');
		if (type !== 'Bearer' || !token) {
			return null;
		}

		return token;
	}
}
