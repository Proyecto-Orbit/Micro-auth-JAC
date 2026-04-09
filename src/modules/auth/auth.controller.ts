import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
	AUTH_COOKIE_MAX_AGE_MS,
	AUTH_COOKIE_NAME,
} from '../../common/constants/auth.constants';
import { AuthService } from './auth.service';
import { GoogleCredentialDto } from './dtos/google-credential.dto';
import { GoogleAuthResponseDto } from './dtos/google-auth-response.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Public()
	@Post('google')
	async authenticateWithGoogle(
		@Body() body: GoogleCredentialDto,
		@Res({ passthrough: true }) response: Response,
	): Promise<GoogleAuthResponseDto> {
		const authResult = await this.authService.authenticateWithGoogle(body?.credential);
		const { token, ...sessionUser } = authResult;

		response.cookie(AUTH_COOKIE_NAME, token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
			maxAge: AUTH_COOKIE_MAX_AGE_MS,
			path: '/',
		});

		return sessionUser;
	}

	@Public()
	@Get('me')
	getSessionFromCookie(@Req() request: Request): Promise<GoogleAuthResponseDto> {
		const token = request.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
		return this.authService.getSessionFromToken(token);
	}

	@Public()
	@Post('logout')
	logout(@Res({ passthrough: true }) response: Response): { message: string } {
		response.clearCookie(AUTH_COOKIE_NAME, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
			path: '/',
		});

		return { message: 'Sesión cerrada correctamente' };
	}
}
