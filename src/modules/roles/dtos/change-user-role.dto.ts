import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { RolNombre } from '../../access-data/model/rol.entity';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeUserRoleDto {
	@IsIn(['admin', 'operador'] satisfies RolNombre[])
	@ApiProperty({
		description: 'El nuevo rol que se le asignará al usuario',
		enum: ['admin', 'operador']
	})
	nuevoRol!: RolNombre;

	@IsEmail()
	@MaxLength(255)
	@ApiProperty({
		description: 'El correo electrónico del usuario que realizará el cambio de rol',
		example: 'user@example.com'
	})
	actorCorreo!: string;

	@IsOptional()
	@IsString()
	@MaxLength(500)
	@ApiProperty({
		description: 'Observaciones adicionales sobre el cambio de rol',
		example: 'Cambio solicitado por el usuario debido a una promoción interna.'
	})
	observaciones?: string;
}
