/**
 * EnvConfig: Representa un objeto de configuración de variables de entorno.
 */

type EnvConfig = Record<string, unknown>;

/**
 * requiredString: Valida una variable de entorno obligatoria como cadena.
 * @param value Valor de la variable de entorno.
 * @param keyName Nombre de la variable de entorno.
 * @returns {string} Retorna el valor validado.
 */
const requiredString = (value: unknown, keyName: string): string => {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`La variable ${keyName} es obligatoria`);
	}

	return value.trim();
};

/**
 * parsePort: Convierte y valida una variable de entorno como puerto numerico.
 * @param value Valor de la variable de entorno.
 * @param fallback Valor por defecto si no se recibe un valor.
 * @param keyName Nombre de la variable de entorno.
 * @returns {number} Retorna el puerto validado.
 */
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

/**
 * optionalString: Valida una variable de entorno opcional como cadena.
 * @param value Valor de la variable de entorno.
 * @param fallback Valor por defecto si no se proporciona uno válido.
 * @returns {string} Retorna el valor validado o el valor por defecto.
 */
const optionalString = (value: unknown, fallback: string): string => {
	if (typeof value !== 'string' || !value.trim()) {
		return fallback;
	}

	return value.trim();
};

/**
 * validateEnvConfig: Valida y procesa las variables de entorno necesarias para la aplicación.
 * - PORT: Puerto en el que se ejecutará la aplicación (por defecto 3000).
 * - DB_PORT: Puerto de la base de datos (por defecto 5432).
 * - JWT_SECRET: Clave secreta para la autenticación JWT.
 * - ALLOWED_ORIGINS: Orígenes permitidos para CORS (por defecto http://localhost:5173).
 * @param config Objeto que contiene las variables de entorno a validar.
 * @returns {EnvConfig} Retorna el objeto de configuración validado.
 */
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
