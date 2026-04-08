import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { UsuarioRepository } from '../access-data/repositories/usuario.repository';
import {
	GoogleAuthResponseDto,
	RoleName,
} from './dtos/google-auth-response.dto';

@Injectable()
export class AuthService {
	private readonly googleClient = new OAuth2Client();

	constructor(
		private readonly usuarioRepository: UsuarioRepository,
	) {}

	async authenticateWithGoogle(	credential: string,): Promise<GoogleAuthResponseDto> {
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

			return {
				usuario: payload.sub,
				rol,
				nombre: payload.name,
				email,
			};
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}

			throw new UnauthorizedException('Credencial de Google inválida o expirada');
		}
	}
}
