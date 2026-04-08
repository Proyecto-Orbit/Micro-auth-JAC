import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CambioEntity } from './model/cambio.entity';
import { RolEntity } from './model/rol.entity';
import { UsuarioEntity } from './model/usuario.entity';
import { CambioRepository } from './repositories/cambio.repository';
import { RolRepository } from './repositories/rol.repository';
import { UsuarioRepository } from './repositories/usuario.repository';
import { InitialSeedService } from './seed/initial-seed.service';
// C:\Users\spart\Documents\LocalProyects\JAC Proyect\microservicio-autenticación\src\modules\access-data\model\cambio.entity.ts
@Module({
	imports: [TypeOrmModule.forFeature([UsuarioEntity, RolEntity, CambioEntity])],
	providers: [UsuarioRepository, RolRepository, CambioRepository, InitialSeedService],
	exports: [UsuarioRepository, RolRepository, CambioRepository],
})
export class AccessDataModule {}
