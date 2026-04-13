import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { RolNombre } from '../../access-data/model/rol.entity';
import type { UsuarioEstado } from '../../access-data/model/usuario.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
	@IsEmail()
	@MaxLength(255)
	@ApiProperty({
		description: 'El correo electrónico del usuario',
		example: 'user@example.com'
	})
	correo!: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(100)
	@ApiProperty({
		description: 'El nombre del usuario',
		example: 'Juan'
	})
	nombre!: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(100)
	@ApiProperty({
		description: 'El apellido del usuario',
		example: 'Pérez'
	})
	apellido!: string;

	@IsIn(['admin', 'operador'] satisfies RolNombre[])
	@ApiProperty({
		description: 'El rol del usuario',
		enum: ['admin', 'operador']
	})
	rol!: RolNombre;

	@IsOptional()
	@IsIn(['activo', 'inactivo'] satisfies UsuarioEstado[])
	@ApiProperty({
		description: 'El estado del usuario',
		enum: ['activo', 'inactivo']
	})
	estado?: UsuarioEstado;
}
