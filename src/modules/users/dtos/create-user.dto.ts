import { RolNombre } from '../../access-data/model/rol.entity';
import { UsuarioEstado } from '../../access-data/model/usuario.entity';

export class CreateUserDto {
	correo!: string;
	nombre!: string;
	apellido!: string;
	rol!: RolNombre;
	estado?: UsuarioEstado;
}
