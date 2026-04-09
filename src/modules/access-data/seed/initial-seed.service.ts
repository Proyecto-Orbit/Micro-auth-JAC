import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { RolRepository } from '../repositories/rol.repository';
import { UsuarioRepository } from '../repositories/usuario.repository';

/**
 * InitialSeedService: Ejecuta seed inicial de roles y usuario administrador.
 */
@Injectable()
export class InitialSeedService implements OnApplicationBootstrap {
	private readonly logger = new Logger(InitialSeedService.name);
	private readonly adminCorreo = 'spartanjuanv@gmail.com';

	constructor(
		private readonly rolRepository: RolRepository,
		private readonly usuarioRepository: UsuarioRepository,
	) {}

	/**
	 * onApplicationBootstrap: Asegura roles por defecto y crea admin inicial si no existe.
	 * @returns {Promise<void>} Finaliza el proceso de siembra inicial.
	 */
	async onApplicationBootstrap(): Promise<void> {
		await this.rolRepository.ensureDefaultRoles();

		const existingAdmin = await this.usuarioRepository.findByCorreo(this.adminCorreo);
		if (existingAdmin) {
			this.logger.debug('Seed inicial: usuario admin ya existe, no se realizan cambios.');
			return;
		}

		const adminRole = await this.rolRepository.findByNombre('admin');
		if (!adminRole) {
			this.logger.warn('Seed inicial: no se pudo resolver el rol admin.');
			return;
		}

		await this.usuarioRepository.createUser({
			correo: this.adminCorreo,
			nombre: 'Juan',
			apellido: 'Vela',
			estado: 'activo',
			rol: adminRole,
		});

		this.logger.log('Seed inicial ejecutado: creado usuario admin por defecto.');
	}
}
