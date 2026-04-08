import { Body, Controller, Param, Patch } from '@nestjs/common';
import { ChangeUserRoleDto } from './dtos/change-user-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
	constructor(private readonly rolesService: RolesService) {}

	@Patch('users/:correo')
	changeUserRole(@Param('correo') correo: string, @Body() body: ChangeUserRoleDto) {
		return this.rolesService.changeUserRole(correo, body);
	}
}
