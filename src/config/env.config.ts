type EnvConfig = Record<string, unknown>;

const requiredString = (value: unknown, keyName: string): string => {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`La variable ${keyName} es obligatoria`);
	}

	return value.trim();
};

const parsePort = (value: unknown, fallback: number, keyName: string): number => {
	if (value === undefined || value === null || value === '') {
		return fallback;
	}

	const parsed = Number(value);
	if (Number.isNaN(parsed)) {
		throw new Error(`La variable ${keyName} debe ser un numero valido`);
	}

	return parsed;
};

const optionalString = (value: unknown, fallback: string): string => {
	if (typeof value !== 'string' || !value.trim()) {
		return fallback;
	}

	return value.trim();
};

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');

/**
 * validateEnvConfig: valida y normaliza las variables de entorno requeridas
 * por el microservicio de gestion de usuarios de Keycloak.
 */
export const validateEnvConfig = (config: EnvConfig): EnvConfig => ({
	...config,
	PORT: parsePort(config.PORT, 3000, 'PORT'),
	ALLOWED_ORIGINS: optionalString(config.ALLOWED_ORIGINS, 'http://localhost:5173'),
	KEYCLOAK_BASE_URL: normalizeBaseUrl(
		requiredString(config.KEYCLOAK_BASE_URL, 'KEYCLOAK_BASE_URL'),
	),
	KEYCLOAK_REALM: requiredString(config.KEYCLOAK_REALM, 'KEYCLOAK_REALM'),
	KEYCLOAK_ADMIN_CLIENT_ID: requiredString(
		config.KEYCLOAK_ADMIN_CLIENT_ID,
		'KEYCLOAK_ADMIN_CLIENT_ID',
	),
	KEYCLOAK_ADMIN_CLIENT_SECRET: requiredString(
		config.KEYCLOAK_ADMIN_CLIENT_SECRET,
		'KEYCLOAK_ADMIN_CLIENT_SECRET',
	),
	KEYCLOAK_PUBLIC_CLIENT_ID: optionalString(
		config.KEYCLOAK_PUBLIC_CLIENT_ID,
		'frontend-client',
	),
});
