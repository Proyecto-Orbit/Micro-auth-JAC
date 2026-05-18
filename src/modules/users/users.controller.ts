import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post,
} from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiOperation,
	ApiParam,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger';
import { AuthUser } from '../../common/decorators/authenticated-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Roles('admin', 'superadmin')
@Controller('usuarios')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get()
	@ApiOperation({ summary: 'Lista los usuarios del realm (superadmin, admin u operador)' })
	@ApiResponse({ status: 200, type: [UserResponseDto] })
	listUsers(): Promise<UserResponseDto[]> {
		return this.usersService.listUsers();
	}

	@Post()
	@ApiOperation({
		summary: 'Crea un usuario',
		description:
			'Admin puede crear operadores. Solo superadmin puede crear administradores.',
	})
	@ApiResponse({ status: 201, type: UserResponseDto })
	@ApiResponse({ status: 403, description: 'No autorizado para asignar ese rol' })
	@ApiResponse({ status: 409, description: 'Ya existe un usuario con ese correo' })
	createUser(
		@Body() dto: CreateUserDto,
		@AuthUser() caller: AuthenticatedUser,
	): Promise<UserResponseDto> {
		return this.usersService.createUser(dto, caller);
	}

	@Patch(':id')
	@ApiOperation({
		summary: 'Actualiza nombre y/o estado',
		description:
			'Admin solo puede modificar operadores. Superadmin tambien puede modificar administradores.',
	})
	@ApiParam({ name: 'id', description: 'UUID del usuario en Keycloak' })
	@ApiResponse({ status: 200, type: UserResponseDto })
	@ApiResponse({ status: 403, description: 'No autorizado para modificar este usuario' })
	@ApiResponse({ status: 404, description: 'Usuario no encontrado' })
	updateUser(
		@Param('id') id: string,
		@Body() dto: UpdateUserDto,
		@AuthUser() caller: AuthenticatedUser,
	): Promise<UserResponseDto> {
		return this.usersService.updateUser(id, dto, caller);
	}

	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({
		summary: 'Elimina un usuario del realm',
		description:
			'Admin solo puede eliminar operadores. Superadmin tambien puede eliminar administradores.',
	})
	@ApiParam({ name: 'id', description: 'UUID del usuario en Keycloak' })
	@ApiResponse({ status: 204, description: 'Usuario eliminado' })
	@ApiResponse({ status: 403, description: 'No autorizado para eliminar este usuario' })
	@ApiResponse({ status: 404, description: 'Usuario no encontrado' })
	deleteUser(
		@Param('id') id: string,
		@AuthUser() caller: AuthenticatedUser,
	): Promise<void> {
		return this.usersService.deleteUser(id, caller);
	}
}
