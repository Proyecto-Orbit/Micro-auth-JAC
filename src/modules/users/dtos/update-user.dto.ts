import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * UpdateUserDto: campos editables de un operador.
 * Permite cambiar el nombre y/o activar/desactivar al usuario en una sola request.
 */
export class UpdateUserDto {
	@ApiPropertyOptional({ example: 'Juan Perez' })
	@IsOptional()
	@IsString()
	@MinLength(1)
	nombre?: string;

	@ApiPropertyOptional({ example: true })
	@IsOptional()
	@IsBoolean()
	activo?: boolean;
}
