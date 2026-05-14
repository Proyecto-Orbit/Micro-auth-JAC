import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CreateUserDto } from './dtos/create-user.dto';
import { UsersService } from './users.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) { }

	@ApiOperation({ summary: 'Crea un nuevo usuario en el sistema' })
	@ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
	@ApiResponse({ status: 400, description: 'Faltan campos obligatorios o los datos son inválidos' })
	@ApiResponse({ status: 404, description: 'El rol especificado no existe' })
	@ApiResponse({ status: 409, description: 'Ya existe un usuario registrado con ese correo electrónico' })
	@Public()
	@Post()
	createUser(@Body() body: CreateUserDto) {
		return this.usersService.createUser(body);
	}

	@ApiOperation({ summary: 'Obtiene un usuario por su correo electrónico' })
	@ApiParam({ name: 'correo', description: 'Correo electrónico del usuario a consultar', example: 'juan@example.com' })
	@ApiResponse({ status: 200, description: 'Datos del usuario encontrado' })
	@ApiResponse({ status: 401, description: 'No autenticado: se requiere una sesión activa' })
	@ApiResponse({ status: 404, description: 'No existe un usuario con ese correo electrónico' })
	@Get(':correo')
	getUserByCorreo(@Param('correo') correo: string) {
		return this.usersService.getUserByCorreo(correo);
	}
}
