import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CambioEstado } from '../access-data/model/cambio.entity';
import { CambioRepository } from '../access-data/repositories/cambio.repository';
import { RolRepository } from '../access-data/repositories/rol.repository';
import { UsuarioRepository } from '../access-data/repositories/usuario.repository';
import { ChangeUserRoleDto } from './dtos/change-user-role.dto';

@Injectable()
export class RolesService {
	constructor(
		private readonly dataSource: DataSource,
		private readonly usuarioRepository: UsuarioRepository,
		private readonly rolRepository: RolRepository,
		private readonly cambioRepository: CambioRepository,
	) {}

	async changeUserRole(correo: string, input: ChangeUserRoleDto) {
		if (!input?.nuevoRol || !input?.actorCorreo?.trim()) {
			throw new BadRequestException('nuevoRol y actorCorreo son obligatorios');
		}

		const targetCorreo = correo.trim().toLowerCase();
		const actorCorreo = input.actorCorreo.trim().toLowerCase();

		return this.dataSource.transaction(async (manager) => {
			await this.rolRepository.ensureDefaultRoles(manager);

			const usuario = await this.usuarioRepository.findByCorreo(targetCorreo, manager);
			if (!usuario) {
				throw new NotFoundException('Usuario objetivo no encontrado');
			}

			const actor = await this.usuarioRepository.findByCorreo(actorCorreo, manager);
			if (!actor) {
				throw new NotFoundException('Usuario actor no encontrado');
			}

			const nuevoRol = await this.rolRepository.findByNombre(input.nuevoRol, manager);
			if (!nuevoRol) {
				throw new NotFoundException(`No existe el rol ${input.nuevoRol}`);
			}

			const datosAnteriores = {
				correo: usuario.correo,
				rol: usuario.rol.nombre,
			};

			const updatedUser = await this.usuarioRepository.updateRoleByCorreo(
				targetCorreo,
				nuevoRol,
				manager,
			);

			if (!updatedUser) {
				throw new NotFoundException('No fue posible actualizar el rol del usuario');
			}

			const datosNuevos = {
				correo: updatedUser.correo,
				rol: updatedUser.rol.nombre,
			};

			const observaciones =
				input.observaciones?.trim() ||
				`Cambio de rol de ${datosAnteriores.rol} a ${datosNuevos.rol}`;

			const cambio = await this.cambioRepository.registerCambio(
				{
					usuarioCreador: actor,
					usuarioAprueba: actor,
					tablaAfectada: 'usuario',
					datosAnteriores,
					datosNuevos,
					estado: CambioEstado.APROBADO,
					observaciones,
					fechaAprobacion: new Date(),
				},
				manager,
			);

			return {
				correo: updatedUser.correo,
				rolAnterior: datosAnteriores.rol,
				rolNuevo: datosNuevos.rol,
				cambioId: cambio.id,
			};
		});
	}
}
