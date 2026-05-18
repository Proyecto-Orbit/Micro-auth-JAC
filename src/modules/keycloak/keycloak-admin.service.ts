import {
	Injectable,
	InternalServerErrorException,
	Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';

type TokenResponse = {
	access_token: string;
	expires_in: number;
	token_type: string;
};

type CachedToken = {
	token: string;
	expiresAt: number;
};

/**
 * Margen de seguridad (ms) restado al expires_in para refrescar antes de la expiracion real.
 */
const TOKEN_REFRESH_MARGIN_MS = 5_000;

/**
 * KeycloakAdminService: obtiene y cachea un access token de servicio
 * (client_credentials) y expone un cliente HTTP preconfigurado para invocar
 * la Admin REST API de Keycloak (/admin/realms/{realm}/...).
 */
@Injectable()
export class KeycloakAdminService {
	private readonly logger = new Logger(KeycloakAdminService.name);
	private readonly baseUrl: string;
	private readonly realm: string;
	private readonly clientId: string;
	private readonly clientSecret: string;
	private cached: CachedToken | null = null;
	private inflight: Promise<string> | null = null;

	constructor(config: ConfigService) {
		this.baseUrl = config.getOrThrow<string>('KEYCLOAK_BASE_URL');
		this.realm = config.getOrThrow<string>('KEYCLOAK_REALM');
		this.clientId = config.getOrThrow<string>('KEYCLOAK_ADMIN_CLIENT_ID');
		this.clientSecret = config.getOrThrow<string>('KEYCLOAK_ADMIN_CLIENT_SECRET');
	}

	get realmName(): string {
		return this.realm;
	}

	/**
	 * getAdminToken: devuelve un access token vigente, refrescandolo si esta por expirar.
	 * Las peticiones concurrentes comparten la misma promesa para evitar pedir varios tokens.
	 */
	async getAdminToken(): Promise<string> {
		const now = Date.now();
		if (this.cached && this.cached.expiresAt > now) {
			return this.cached.token;
		}

		if (this.inflight) {
			return this.inflight;
		}

		this.inflight = this.requestNewToken()
			.then((token) => {
				this.inflight = null;
				return token;
			})
			.catch((error) => {
				this.inflight = null;
				throw error;
			});

		return this.inflight;
	}

	/**
	 * adminClient: cliente axios con baseURL `/admin/realms/{realm}` y Authorization Bearer
	 * inyectado automaticamente con el token de servicio.
	 */
	async adminClient(): Promise<AxiosInstance> {
		const token = await this.getAdminToken();
		return axios.create({
			baseURL: `${this.baseUrl}/admin/realms/${encodeURIComponent(this.realm)}`,
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			validateStatus: () => true,
		});
	}

	private async requestNewToken(): Promise<string> {
		const url = `${this.baseUrl}/realms/${encodeURIComponent(this.realm)}/protocol/openid-connect/token`;
		const params = new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: this.clientId,
			client_secret: this.clientSecret,
		});

		try {
			const { data } = await axios.post<TokenResponse>(url, params.toString(), {
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			});

			if (!data?.access_token || typeof data.expires_in !== 'number') {
				throw new Error('Respuesta de token invalida desde Keycloak');
			}

			this.cached = {
				token: data.access_token,
				expiresAt: Date.now() + data.expires_in * 1000 - TOKEN_REFRESH_MARGIN_MS,
			};

			return data.access_token;
		} catch (error) {
			this.cached = null;
			const message =
				error instanceof AxiosError
					? `Keycloak token endpoint respondio ${error.response?.status ?? 'sin respuesta'}`
					: 'No fue posible obtener el admin token de Keycloak';
			this.logger.error(message);
			throw new InternalServerErrorException('No fue posible autenticar contra Keycloak');
		}
	}
}
