import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { UsuarioRepository } from '../access-data/repositories/usuario.repository';
import {
	GoogleAuthResponseDto,
	RoleName,
} from './dtos/google-auth-response.dto';

/**
 * SessionJwtPayload: Estructura del payload esperado en JWT de sesion.
 */
type SessionJwtPayload = {
	sub: string;
	email?: string;
	nombre: string;
	rol: string;
};

/**
 * AuthService: Servicio de autenticacion con Google y gestion de sesion JWT.
 */
@Injectable()
export class AuthService {
	private readonly googleClient = new OAuth2Client();

	constructor(
		private readonly usuarioRepository: UsuarioRepository,
		private readonly jwtService: JwtService,
	) {}
	/**
	 * authenticateWithGoogle: Autentica usuario con credencial de Google y emite JWT.
	 * @param credential ID token de Google recibido desde el cliente.
	 * @returns {Promise<GoogleAuthResponseDto>} Datos de sesion y token JWT.
	 */
	async authenticateWithGoogle(credential: string): Promise<GoogleAuthResponseDto> {
		if (!credential?.trim()) {
			throw new BadRequestException('No se recibió la credencial de Google');
		}

		const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
		if (!googleClientId) {
			throw new InternalServerErrorException('Error interno del servidor');
		}

		try {
			const ticket = await this.googleClient.verifyIdToken({
				idToken: credential,
				audience: googleClientId,
			});
			const payload = ticket.getPayload();

			if (!payload?.sub || !payload?.name) {
				throw new UnauthorizedException(
					'No fue posible validar los datos del usuario con Google',
				);
			}

			if (payload.email_verified === false) {
				throw new UnauthorizedException('La cuenta de Google no está verificada');
			}

			const email = payload.email?.trim().toLowerCase();
			if (!email) {
				throw new UnauthorizedException('No fue posible obtener el correo del usuario');
			}

			const usuario = await this.usuarioRepository.findByCorreo(email);

			if (!usuario?.rol?.nombre) {
				throw new UnauthorizedException('El usuario no está registrado en el sistema');
			}

			const rol = usuario.rol.nombre as RoleName;
			const jwtSecret = process.env.JWT_SECRET?.trim();
			if (!jwtSecret) {
				throw new InternalServerErrorException('Error interno del servidor');
			}

			const token = await this.jwtService.signAsync(
				{
					sub: payload.sub,
					email,
					nombre: payload.name,
					rol,
				},
				{
					secret: jwtSecret,
					expiresIn: '8h',
				},
			);

			return {
				usuario: payload.sub,
				sub: payload.sub,
				rol,
				nombre: payload.name,
				email,
				token,
			};
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}

			throw new UnauthorizedException('Credencial de Google inválida o expirada');
		}
	}

	/**
	 * getSessionFromToken: Valida token JWT y retorna datos de sesion.
	 * @param token Token JWT proveniente de cookie o cabecera.
	 * @returns {Promise<GoogleAuthResponseDto>} Datos de sesion del usuario.
	 */
	async getSessionFromToken(token?: string): Promise<GoogleAuthResponseDto> {
		if (!token?.trim()) {
			throw new UnauthorizedException('No se encontró una sesión activa');
		}

		const jwtSecret = process.env.JWT_SECRET?.trim();
		if (!jwtSecret) {
			throw new InternalServerErrorException('Error interno del servidor');
		}

		try {
			const payload = await this.jwtService.verifyAsync<SessionJwtPayload>(token, {
				secret: jwtSecret,
			});

			if (!payload?.sub || !payload?.nombre || !this.isValidRole(payload.rol)) {
				throw new UnauthorizedException('Token JWT inválido o expirado');
			}

			return {
				usuario: payload.sub,
				sub: payload.sub,
				rol: payload.rol,
				nombre: payload.nombre,
				email: payload.email,
			};
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}

			throw new UnauthorizedException('Token JWT inválido o expirado');
		}
	}

	/**
	 * isValidRole: Verifica si el rol pertenece al conjunto permitido.
	 * @param role Rol recibido en el payload JWT.
	 * @returns {role is RoleName} True cuando el rol es valido.
	 */
	private isValidRole(role: string): role is RoleName {
		return role === 'admin' || role === 'operador' || role === 'usuario';
	}
}
