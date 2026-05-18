import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Roles existentes en el sistema. Solo se pueden crear admin/operador via API.
 * El rol superadmin se asigna manualmente en Keycloak.
 */
export const SYSTEM_ROLES = ['superadmin', 'admin', 'operador'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const CREATABLE_ROLES = ['admin', 'operador'] as const;
export type CreatableRole = (typeof CREATABLE_ROLES)[number];

export class CreateUserDto {
	@ApiProperty({ example: 'jperez@example.com' })
	@IsEmail()
	correo!: string;

	@ApiProperty({ example: 'Juan' })
	@IsString()
	@MinLength(1)
	nombre!: string;

	@ApiProperty({ example: 'Perez' })
	@IsString()
	@MinLength(1)
	apellido!: string;

	@ApiProperty({ enum: CREATABLE_ROLES, example: 'operador' })
	@IsIn(CREATABLE_ROLES as unknown as string[])
	rol!: CreatableRole;

	@ApiProperty({
		example: 'TempPass123!',
		description:
			'Contrasena temporal. El usuario debera cambiarla obligatoriamente en su primer login.',
		minLength: 8,
		maxLength: 128,
	})
	@IsString()
	@MinLength(8)
	@MaxLength(128)
	passwordTemporal!: string;
}
