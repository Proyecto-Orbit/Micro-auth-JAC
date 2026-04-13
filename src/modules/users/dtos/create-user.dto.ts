import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { RolNombre } from '../../access-data/model/rol.entity';
import type { UsuarioEstado } from '../../access-data/model/usuario.entity';

export class CreateUserDto {
	@IsEmail()
	@MaxLength(255)
	correo!: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(100)
	nombre!: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(100)
	apellido!: string;

	@IsIn(['admin', 'operador'] satisfies RolNombre[])
	rol!: RolNombre;

	@IsOptional()
	@IsIn(['activo', 'inactivo'] satisfies UsuarioEstado[])
	estado?: UsuarioEstado;
}
