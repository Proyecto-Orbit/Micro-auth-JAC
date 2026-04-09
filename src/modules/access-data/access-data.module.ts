import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolEntity } from './model/rol.entity';
import { UsuarioEntity } from './model/usuario.entity';
import { RolRepository } from './repositories/rol.repository';
import { UsuarioRepository } from './repositories/usuario.repository';
import { InitialSeedService } from './seed/initial-seed.service';

/**
 * AccessDataModule: Modulo de acceso a datos para usuarios y roles.
 */
@Module({
	imports: [TypeOrmModule.forFeature([UsuarioEntity, RolEntity])],
	providers: [UsuarioRepository, RolRepository, InitialSeedService],
	exports: [UsuarioRepository, RolRepository],
})
export class AccessDataModule {}
