type EnvConfig = Record<string, unknown>;

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

export const validateEnvConfig = (config: EnvConfig): EnvConfig => ({
	...config,
	PORT: parsePort(config.PORT, 3000, 'PORT'),
	DB_PORT: parsePort(config.DB_PORT, 5432, 'DB_PORT'),
});
