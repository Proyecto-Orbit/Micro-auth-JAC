import { Body, Controller, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ChangeUserRoleDto } from './dtos/change-user-role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
	constructor(private readonly rolesService: RolesService) {}

	@ApiOperation({ summary: 'Actualiza el rol de un usuario registrado en el sistema' })
	@ApiParam({ name: 'correo', description: 'Correo electrónico del usuario al que se le cambiará el rol', example: 'juan@example.com' })
	@ApiResponse({ status: 200, description: 'Rol actualizado exitosamente' })
	@ApiResponse({ status: 400, description: 'Faltan campos obligatorios (nuevoRol o actorCorreo)' })
	@ApiResponse({ status: 401, description: 'No autenticado: se requiere una sesión activa' })
	@ApiResponse({ status: 404, description: 'El usuario objetivo, el actor o el rol especificado no existe' })
	@Patch('users/:correo')
	changeUserRole(@Param('correo') correo: string, @Body() body: ChangeUserRoleDto) {
		return this.rolesService.changeUserRole(correo, body);
	}
}
