import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { RolRepository } from '../access-data/repositories/rol.repository';
import { UsuarioRepository } from '../access-data/repositories/usuario.repository';
import { CreateUserDto } from './dtos/create-user.dto';

@Injectable()
export class UsersService {
	constructor(
		private readonly usuarioRepository: UsuarioRepository,
		private readonly rolRepository: RolRepository,
	) {}

	async createUser(input: CreateUserDto) {
		if (!input?.correo?.trim() || !input?.nombre?.trim() || !input?.apellido?.trim()) {
			throw new BadRequestException('correo, nombre y apellido son obligatorios');
		}

		await this.rolRepository.ensureDefaultRoles();

		const correo = input.correo.trim().toLowerCase();
		const existingUser = await this.usuarioRepository.findByCorreo(correo);
		if (existingUser) {
			throw new ConflictException('Ya existe un usuario con ese correo');
		}

		const rol = await this.rolRepository.findByNombre(input.rol);
		if (!rol) {
			throw new NotFoundException(`No existe el rol ${input.rol}`);
		}

		const createdUser = await this.usuarioRepository.createUser({
			correo,
			nombre: input.nombre,
			apellido: input.apellido,
			estado: input.estado,
			rol,
		});

		return this.toUserResponse(createdUser);
	}

	async getUserByCorreo(correo: string) {
		const user = await this.usuarioRepository.findByCorreo(correo);
		if (!user) {
			throw new NotFoundException('Usuario no encontrado');
		}

		return this.toUserResponse(user);
	}

	async findByCorreo(correo: string) {
		return this.usuarioRepository.findByCorreo(correo);
	}

	private toUserResponse(user: {
		correo: string;
		nombre: string;
		apellido: string;
		estado: string;
		rol?: { nombre: string };
	}) {
		return {
			correo: user.correo,
			nombre: user.nombre,
			apellido: user.apellido,
			estado: user.estado,
			rol: user.rol?.nombre,
		};
	}
}
