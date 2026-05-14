import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * RoleName: Roles permitidos en respuestas de autenticacion.
 */
export type RoleName = 'admin' | 'operador' | 'usuario';

/**
 * GoogleAuthResponseDto: Estructura de respuesta de sesion autenticada.
 */
export class GoogleAuthResponseDto {
  @ApiProperty({ description: 'Identificador único de Google del usuario (subject)', example: '102938475610293847561' })
  @IsString()
  @IsNotEmpty()
  usuario!: string;

  @ApiProperty({ description: 'Rol asignado al usuario en el sistema', enum: ['admin', 'operador', 'usuario'] })
  @IsEnum(['admin', 'operador', 'usuario'])
  rol!: RoleName;

  @ApiProperty({ description: 'Nombre completo del usuario según Google', example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({ description: 'Correo electrónico del usuario', example: 'juan@example.com', required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Subject identifier de Google (alias de usuario)', example: '102938475610293847561', required: false })
  @IsString()
  @IsOptional()
  sub?: string;

  @ApiHideProperty()
  @IsString()
  @IsOptional()
  token?: string;
}