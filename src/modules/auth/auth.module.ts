import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { AccessDataModule } from '../access-data/access-data.module';

@Module({
	imports: [UsersModule, AccessDataModule],
	controllers: [AuthController],
	providers: [AuthService ],
	exports: [AuthService ],
})
export class AuthModule {}
