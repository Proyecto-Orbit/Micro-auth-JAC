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
	GoogleAuthWithTokenDto,
	RoleName,
} from './dtos/google-auth-response.dto';

type SessionJwtPayload = {
	sub: string;
	email?: string;
	nombre: string;
	rol: string;
};

@Injectable()
export class AuthService {
	private readonly googleClient = new OAuth2Client();

	constructor(
		private readonly usuarioRepository: UsuarioRepository,
		private readonly jwtService: JwtService,
	) {}
	/*
	Metodo principal encargado de la autenticacion y autorizacion de usuarios mediante Google. Valida la credencial recibida,
	verifica la cuenta de Google, obtiene o valida el rol del usuario en el sistema, 
	y genera un token JWT con la informacion del usuario y su rol para ser usado en futuras solicitudes autenticadas.
	@param string credential - La credencial de Google recibida desde el cliente, que contiene el ID token a validar.
	*/
	async authenticateWithGoogle(credential: string): Promise<GoogleAuthWithTokenDto> {
		if (!credential?.trim()) {
			throw new BadRequestException('No se recibió la credencial de Google');
		}

		const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
		if (!googleClientId) {
			throw new InternalServerErrorException(
				'GOOGLE_CLIENT_ID no está configurado en el backend',
			);
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

			const usuario = await this.usuarioRepository.findByCorreo(email); // Aqui se hace la llamada al repositorio bro.

			if (!usuario?.rol?.nombre) {
				throw new UnauthorizedException('El usuario no está registrado en el sistema');
			}

			const rol = usuario.rol.nombre as RoleName;
			const jwtSecret = process.env.JWT_SECRET?.trim();
			if (!jwtSecret) {
				throw new InternalServerErrorException(
					'JWT_SECRET no está configurado en el backend',
				);
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
					expiresIn: '8h', // TODO: Configurar expiracion más corta y usar refresh tokens para sesiones más largas.
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

	async getSessionFromToken(token?: string): Promise<GoogleAuthResponseDto> {
		if (!token?.trim()) {
			throw new UnauthorizedException('No se encontró una sesión activa'); // TODO: Segura
		}

		const jwtSecret = process.env.JWT_SECRET?.trim();
		if (!jwtSecret) {
			throw new InternalServerErrorException(
				'JWT_SECRET no está configurado en el backend',
			);
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

	private isValidRole(role: string): role is RoleName {
		return role === 'admin' || role === 'operador' || role === 'usuario';
	}
}
