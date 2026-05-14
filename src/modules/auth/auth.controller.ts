import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
	AUTH_COOKIE_MAX_AGE_MS,
	AUTH_COOKIE_NAME,
} from '../../common/constants/auth.constants';
import { AuthService } from './auth.service';
import { GoogleCredentialDto } from './dtos/google-credential.dto';
import { GoogleAuthResponseDto } from './dtos/google-auth-response.dto';
import { Public } from '../../common/decorators/public.decorator';

/**
 * AuthController: Controlador HTTP para autenticacion y sesion.
 */
@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	/**
	 * authenticateWithGoogle: Autentica un usuario con credencial de Google.
	 * @param body DTO con la credencial de Google.
	 * @param response Respuesta HTTP para establecer cookie de sesion.
	 * @returns {Promise<GoogleAuthResponseDto>} Datos de sesion del usuario autenticado.
	 */
	@ApiOperation({ summary: 'Autentica un usuario con credencial de Google OAuth2 y abre una sesión' })
	@ApiResponse({ status: 200, description: 'Autenticación exitosa. Se establece la cookie de sesión', type: GoogleAuthResponseDto })
	@ApiResponse({ status: 400, description: 'La credencial de Google no fue enviada en el cuerpo de la solicitud' })
	@ApiResponse({ status: 401, description: 'La credencial de Google es inválida o expirada, o el usuario no está registrado en el sistema' })
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
			sameSite: 'strict',
			maxAge: AUTH_COOKIE_MAX_AGE_MS,
			path: '/',
		});

		return sessionUser;
	}

	/**
	 * getSessionFromCookie: Obtiene la sesion actual desde la cookie de autenticacion.
	 * @param request Solicitud HTTP entrante.
	 * @returns {Promise<GoogleAuthResponseDto>} Datos de la sesion activa.
	 */
	@ApiOperation({ summary: 'Obtiene los datos de la sesión activa a partir de la cookie HTTP-Only de autenticación' })
	@ApiResponse({ status: 200, description: 'Sesión activa válida', type: GoogleAuthResponseDto })
	@ApiResponse({ status: 401, description: 'No hay sesión activa, o el token es inválido o ha expirado' })
	@Public()
	@Get('me')
	getSessionFromCookie(@Req() request: Request): Promise<GoogleAuthResponseDto> {
		const token = request.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
		return this.authService.getSessionFromToken(token);
	}

	/**
	 * logout: Elimina la cookie de sesion actual.
	 * @param response Respuesta HTTP para limpiar cookie.
	 * @returns {{ message: string }} Confirmacion de cierre de sesion.
	 */
	@ApiOperation({ summary: 'Cierra la sesión del usuario' })
	@ApiResponse({ status: 200, description: 'Sesión cerrada correctamente' })
	@Public()
	@Post('logout')
	logout(@Res({ passthrough: true }) response: Response): { message: string } {
		response.clearCookie(AUTH_COOKIE_NAME, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			path: '/',
		});

		return { message: 'Sesión cerrada correctamente' };
	}
}
