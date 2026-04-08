import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { RolEntity, RolNombre } from '../model/rol.entity';

@Injectable()
export class RolRepository {
	private readonly roleNames: RolNombre[] = ['admin', 'operador'];

	constructor(
		@InjectRepository(RolEntity)
		private readonly rolOrmRepository: Repository<RolEntity>,
	) {}

	async ensureDefaultRoles(manager?: EntityManager): Promise<void> {
		const repository = this.getRepository(manager);

		for (const roleName of this.roleNames) {
			const existingRole = await repository.findOne({ where: { nombre: roleName } });
			if (existingRole) {
				continue;
			}

			await repository.save(repository.create({ nombre: roleName }));
		}
	}

	async findByNombre(nombre: RolNombre, manager?: EntityManager): Promise<RolEntity | null> {
		const repository = this.getRepository(manager);
		return repository.findOne({ where: { nombre } });
	}

	private getRepository(manager?: EntityManager): Repository<RolEntity> {
		if (manager) {
			return manager.getRepository(RolEntity);
		}

		return this.rolOrmRepository;
	}
}