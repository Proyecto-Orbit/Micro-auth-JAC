import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { RolRepository } from '../repositories/rol.repository';
import { UsuarioRepository } from '../repositories/usuario.repository';

/**
 * InitialSeedService: Ejecuta seed inicial de roles y usuario administrador.
 */
@Injectable()
export class InitialSeedService implements OnApplicationBootstrap {
	private readonly logger = new Logger(InitialSeedService.name);

	constructor(
		private readonly rolRepository: RolRepository,
		private readonly usuarioRepository: UsuarioRepository,
	) {}

	/**
	 * onApplicationBootstrap: Asegura roles por defecto y crea admin inicial si no existe. SERA ELIMINADO EN PRODUCCION, SOLO PARA DESARROLLO.
	 * @returns {Promise<void>} Finaliza el proceso de siembra inicial.
	 */
	async onApplicationBootstrap(): Promise<void> {
		await this.rolRepository.ensureDefaultRoles();

		const adminCorreos = this.parseEnvList('ADMIN_CORREOS');
		const adminNombres = this.parseEnvList('ADMIN_NOMBRES');
		const adminApellidos = this.parseEnvList('ADMIN_APELLIDOS');

		// Validacion de que las variables de entorno para admin esten configuradas correctamente.
		if (adminCorreos.length === 0) {
			this.logger.warn('Seed inicial: ADMIN_CORREOS no configurado, omitiendo creación de admins.');
			return;
		}

		if (adminCorreos.length !== adminNombres.length || adminCorreos.length !== adminApellidos.length) {
			throw new Error(
				'Seed inicial inválido: ADMIN_CORREOS, ADMIN_NOMBRES y ADMIN_APELLIDOS deben tener la misma cantidad de elementos.',
			);
		}

		const adminRole = await this.rolRepository.findByNombre('admin');
		if (!adminRole) {
			this.logger.warn('Seed inicial: no se pudo resolver el rol admin.');
			return;
		}

		let createdAdmins = 0;
		for (let index = 0; index < adminCorreos.length; index++) {
			const correo = adminCorreos[index];
			const existingAdmin = await this.usuarioRepository.findByCorreo(correo);
			if (existingAdmin) {
				this.logger.debug(`Seed inicial: usuario admin ${correo} ya existe, no se realizan cambios.`);
				continue;
			}

			await this.usuarioRepository.createUser({
				correo,
				nombre: adminNombres[index],
				apellido: adminApellidos[index],
				estado: 'activo',
				rol: adminRole,
			});

			createdAdmins++;
		}

		this.logger.log(`Seed inicial ejecutado: creados ${createdAdmins} administrador(es).`);
	}

	private parseEnvList(envVarName: string): string[] {
		return process.env[envVarName]?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
	}
}
