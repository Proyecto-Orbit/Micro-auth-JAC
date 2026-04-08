import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { RolEntity } from '../model/rol.entity';
import { UsuarioEntity, UsuarioEstado } from '../model/usuario.entity';

export interface CreateUsuarioInput {
	correo: string;
	nombre: string;
	apellido: string;
	estado?: UsuarioEstado;
	rol: RolEntity;
}

@Injectable()
export class UsuarioRepository {
	constructor(
		@InjectRepository(UsuarioEntity)
		private readonly usuarioOrmRepository: Repository<UsuarioEntity>,
	) {}

	async createUser(input: CreateUsuarioInput, manager?: EntityManager): Promise<UsuarioEntity> {
		const repository = this.getRepository(manager);
		const correoNormalizado = this.normalizeCorreo(input.correo);

		const usuario = repository.create({
			correo: correoNormalizado,
			nombre: input.nombre.trim(),
			apellido: input.apellido.trim(),
			estado: input.estado ?? 'activo',
			rol: input.rol,
		});

		return repository.save(usuario);
	}

	async findByCorreo(correo: string, manager?: EntityManager): Promise<UsuarioEntity | null> {
		const repository = this.getRepository(manager);

		return repository.findOne({
			where: { correo: this.normalizeCorreo(correo) },
			relations: { rol: true },
		});
	}

	async updateRoleByCorreo(
		correo: string,
		nuevoRol: RolEntity,
		manager?: EntityManager,
	): Promise<UsuarioEntity | null> {
		const repository = this.getRepository(manager);
		const usuario = await repository.findOne({
			where: { correo: this.normalizeCorreo(correo) },
			relations: { rol: true },
		});

		if (!usuario) {
			return null;
		}

		usuario.rol = nuevoRol;
		return repository.save(usuario);
	}

	private getRepository(manager?: EntityManager): Repository<UsuarioEntity> {
		if (manager) {
			return manager.getRepository(UsuarioEntity);
		}

		return this.usuarioOrmRepository;
	}

	private normalizeCorreo(correo: string): string {
		return correo.trim().toLowerCase();
	}
}