import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SYSTEM_ROLES, type SystemRole } from './create-user.dto';

export class UserResponseDto {
	@ApiProperty() id!: string;
	@ApiProperty({ example: 'Juan Perez' }) nombre!: string;
	@ApiProperty({ example: 'jperez@example.com' }) correo!: string;
	@ApiProperty({ enum: SYSTEM_ROLES }) rol!: SystemRole;
	@ApiProperty() activo!: boolean;
	@ApiPropertyOptional({
		description: 'ISO timestamp del ultimo login (puede estar ausente si nunca ha entrado)',
	})
	ultimaActividad?: string;
}
