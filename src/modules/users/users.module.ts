import { Module } from '@nestjs/common';
import { AccessDataModule } from '../access-data/access-data.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
	imports: [AccessDataModule],
	controllers: [UsersController],
	providers: [UsersService],
	exports: [UsersService],
})
export class UsersModule {}
