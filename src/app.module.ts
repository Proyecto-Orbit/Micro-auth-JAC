import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { KeycloakAuthGuard } from './common/guards/keycloak-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { validateEnvConfig } from './config/env.config';
import { KeycloakModule } from './modules/keycloak/keycloak.module';
import { UsersModule } from './modules/users/users.module';

/**
 * AppModule: configuracion global del microservicio.
 * Aplica guards globales: throttling, validacion de Bearer token contra Keycloak
 * y autorizacion por roles (admin/operador del realm).
 */
@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validate: validateEnvConfig,
		}),
		ThrottlerModule.forRoot([
			{
				ttl: 60_000,
				limit: 30,
			},
		]),
		KeycloakModule,
		UsersModule,
	],
	providers: [
		{ provide: APP_GUARD, useClass: ThrottlerGuard },
		{ provide: APP_GUARD, useClass: KeycloakAuthGuard },
		{ provide: APP_GUARD, useClass: RolesGuard },
	],
})
export class AppModule {}
