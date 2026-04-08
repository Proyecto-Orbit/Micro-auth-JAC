import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleCredentialDto } from './dtos/google-credential.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Public()
	@Post('google')
	authenticateWithGoogle(@Body() body: GoogleCredentialDto) {
		return this.authService.authenticateWithGoogle(body?.credential);
	}
}
