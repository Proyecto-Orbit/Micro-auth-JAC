import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { RolEntity } from '../modules/access-data/model/rol.entity';
import { UsuarioEntity } from '../modules/access-data/model/usuario.entity';

/**
 * getDatabaseConfig: Construye la configuracion de TypeORM desde variables de entorno.
 * @returns {TypeOrmModuleOptions} Configuracion de conexion a PostgreSQL.
 */
export const getDatabaseConfig = (): TypeOrmModuleOptions => ({
	type: 'postgres',
	host: process.env.DB_HOST ?? 'localhost',
	port: Number(process.env.DB_PORT ?? 5432),
	username: process.env.DB_USERNAME ?? 'postgres',
	password: process.env.DB_PASSWORD ?? 'postgres',
	database: process.env.DB_NAME ?? 'postgres',
	entities: [UsuarioEntity, RolEntity],
	synchronize: (process.env.DB_SYNCHRONIZE ?? 'false').toLowerCase() === 'true',
	logging: (process.env.DB_LOGGING ?? 'false').toLowerCase() === 'true',
});
