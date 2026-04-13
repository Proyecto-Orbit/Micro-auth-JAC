import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { RolNombre } from '../../access-data/model/rol.entity';

export class ChangeUserRoleDto {
	@IsIn(['admin', 'operador'] satisfies RolNombre[])
	nuevoRol!: RolNombre;

	@IsEmail()
	@MaxLength(255)
	actorCorreo!: string;

	@IsOptional()
	@IsString()
	@MaxLength(500)
	observaciones?: string;
}
