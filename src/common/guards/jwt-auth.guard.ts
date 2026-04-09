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
	/*
	Metodo principal del guardia de autenticacion JWT. Verifica si la ruta es pública, extrae el token JWT de la cabecera o cookie.
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

	/*
	Metodo para extraer el token sea mediante la cabecera Authorization o mediante la cookie de autenticacion. Prioriza el token en la cabecera si ambos estan presentes.
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
