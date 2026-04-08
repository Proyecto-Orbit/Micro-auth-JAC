import { RolNombre } from '../../access-data/model/rol.entity';

export class ChangeUserRoleDto {
	nuevoRol!: RolNombre;
	actorCorreo!: string;
	observaciones?: string;
}
