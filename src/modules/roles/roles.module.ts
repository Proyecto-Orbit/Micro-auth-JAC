import { Module } from '@nestjs/common';
import { AccessDataModule } from '../access-data/access-data.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
	imports: [AccessDataModule],
	controllers: [RolesController],
	providers: [RolesService],
	exports: [RolesService],
})
export class RolesModule {}
