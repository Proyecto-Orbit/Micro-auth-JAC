import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { validateEnvConfig } from './config/env.config';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';


// TODO - Entender que mierda es eso de validateEnvConfig y getDatabaseConfig, y como se relaciona con el .env.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvConfig,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: getDatabaseConfig,
    }),
    AuthModule,
    UsersModule,
    RolesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
