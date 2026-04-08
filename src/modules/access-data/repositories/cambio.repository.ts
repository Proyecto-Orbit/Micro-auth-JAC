import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CambioEntity, CambioEstado } from '../model/cambio.entity';
import { UsuarioEntity } from '../model/usuario.entity';

export interface RegisterCambioInput {
	usuarioCreador: UsuarioEntity;
	usuarioAprueba?: UsuarioEntity | null;
	tablaAfectada: string;
	datosAnteriores: unknown;
	datosNuevos: unknown;
	estado?: CambioEstado;
	observaciones: string;
	fechaAprobacion?: Date | null;
}

@Injectable()
export class CambioRepository {
	constructor(
		@InjectRepository(CambioEntity)
		private readonly cambioOrmRepository: Repository<CambioEntity>,
	) {}

	async registerCambio(input: RegisterCambioInput, manager?: EntityManager): Promise<CambioEntity> {
		const repository = this.getRepository(manager);
		const estado = input.estado ?? CambioEstado.PENDIENTE;

		const cambio = repository.create({
			usuarioCreador: input.usuarioCreador,
			usuarioAprueba: input.usuarioAprueba ?? null,
			tablaAfectada: input.tablaAfectada,
			datosAnteriores: input.datosAnteriores,
			datosNuevos: input.datosNuevos,
			estado,
			observaciones: input.observaciones,
			fechaAprobacion:
				input.fechaAprobacion ??
				(estado === CambioEstado.APROBADO ? new Date() : null),
		});

		return repository.save(cambio);
	}

	private getRepository(manager?: EntityManager): Repository<CambioEntity> {
		if (manager) {
			return manager.getRepository(CambioEntity);
		}

		return this.cambioOrmRepository;
	}
}