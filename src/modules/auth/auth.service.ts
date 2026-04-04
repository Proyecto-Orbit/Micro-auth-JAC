import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import {
	GoogleAuthResponseDto,
	RoleName,
} from './dtos/google-auth-response.dto';

@Injectable()
export class AuthService {
	private readonly googleClient = new OAuth2Client();

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

			return {
				usuario: payload.sub,
				rol: this.resolveRole(payload),
				nombre: payload.name,
				email: payload.email,
			};
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}

			throw new UnauthorizedException('Credencial de Google inválida o expirada');
		}
	}

	private resolveRole(payload: TokenPayload): RoleName {
		const normalizedEmail = payload.email?.toLowerCase();

		if (this.isEmailInList(normalizedEmail, "spartanjuanv@gmail.com")) {
			return 'admin';
		}

		if (this.isEmailInList(normalizedEmail, "test@gmail.com")) {
			return 'operador';
		}

		return 'usuario';
	}

	private isEmailInList(
		email: string | undefined,
		rawList: string | undefined,
	): boolean {
		if (!email || !rawList) {
			return false;
		}

		return rawList
			.split(',')
			.map((item) => item.trim().toLowerCase())
			.filter(Boolean)
			.includes(email);
	}
}
