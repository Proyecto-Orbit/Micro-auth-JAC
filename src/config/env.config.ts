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
		throw new Error(`La variable ${keyName} debe ser un número válido`);
	}

	return parsed;
};

const optionalString = (value: unknown, fallback: string): string => {
	if (typeof value !== 'string' || !value.trim()) {
		return fallback;
	}

	return value.trim();
};

export const validateEnvConfig = (config: EnvConfig): EnvConfig => ({
	...config,
	PORT: parsePort(config.PORT, 3000, 'PORT'),
	DB_PORT: parsePort(config.DB_PORT, 5432, 'DB_PORT'),
	JWT_SECRET: requiredString(config.JWT_SECRET, 'JWT_SECRET'),
	ALLOWED_ORIGINS: optionalString(
		config.ALLOWED_ORIGINS,
		'http://localhost:5173',
	),
});
