import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Inject,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { AxiosInstance, AxiosResponse } from 'axios';
import { ClientProxy } from '@nestjs/microservices';
import { KeycloakAdminService } from '../keycloak/keycloak-admin.service';
import {
	CreatableRole,
	CreateUserDto,
	SYSTEM_ROLES,
	type SystemRole,
} from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';

type KeycloakUser = {
	id: string;
	username: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	enabled: boolean;
	createdTimestamp?: number;
};

type KeycloakRole = {
	id: string;
	name: string;
};

const SUPERADMIN: SystemRole = 'superadmin';
const ADMIN: SystemRole = 'admin';
const OPERADOR: SystemRole = 'operador';

@Injectable()
export class UsersService {
	private readonly logger = new Logger(UsersService.name);

	constructor(
		private readonly keycloak: KeycloakAdminService,
		@Inject('USUARIOS_PRODUCER') private readonly client: ClientProxy,
	) {}

	async listUsers(): Promise<UserResponseDto[]> {
		const client = await this.keycloak.adminClient();
		const response = await client.get<KeycloakUser[]>('/users', {
			params: { briefRepresentation: false, max: 1000 },
		});
		if (response.status !== 200) {
			this.throwUpstream('listar usuarios', response);
		}

		const users = response.data ?? [];
		const enriched = await Promise.all(
			users.map(async (user) => {
				const roles = await this.getUserRealmRoles(client, user.id);
				return this.toResponse(user, roles);
			}),
		);
		return enriched.filter((u): u is UserResponseDto => u !== null);
	}

	async createUser(dto: CreateUserDto, caller: AuthenticatedUser): Promise<UserResponseDto> {
		this.assertCanAssignRole(caller, dto.rol);

		const client = await this.keycloak.adminClient();
		const correo = dto.correo.trim().toLowerCase();

		const payload = {
			username: correo,
			email: correo,
			firstName: dto.nombre.trim(),
			lastName: dto.apellido.trim(),
			enabled: true,
			emailVerified: false,
			// La contrasena queda marcada como temporary=true en Keycloak: el usuario debera
			// cambiarla obligatoriamente en su primer login. El requiredAction es redundante
			// pero lo dejamos por claridad y como red de seguridad si la policy de password cambia.
			credentials: [
				{
					type: 'password',
					value: dto.passwordTemporal,
					temporary: true,
				},
			],
			requiredActions: ['UPDATE_PASSWORD'],
		};

		const createResponse = await client.post('/users', payload);
		if (createResponse.status === 409) {
			throw new ConflictException('Ya existe un usuario con ese correo');
		}
		if (createResponse.status !== 201) {
			this.throwUpstream('crear usuario', createResponse);
		}

		const userId = this.extractUserIdFromLocation(createResponse.headers['location']);
		if (!userId) {
			throw new InternalServerErrorException(
				'Keycloak no devolvio el ID del usuario creado',
			);
		}

		try {
			await this.assignRealmRole(client, userId, dto.rol);
		} catch (error) {
			await client.delete(`/users/${encodeURIComponent(userId)}`).catch(() => undefined);
			throw error;
		}

		const userRes = await this.getUserById(userId);

		try {
			this.client.emit('usuario.creado_o_actualizado', {
				id: userRes.id,
				correo: userRes.correo,
				nombre: userRes.nombre,
				rol: userRes.rol,
			});
			this.logger.log(`Usuario creado emitido a la cola: ${userRes.correo}`);
		} catch (error: any) {
			this.logger.error(`Error emitiendo usuario creado a la cola: ${error.message}`);
		}

		return userRes;
	}

	async getUserById(id: string): Promise<UserResponseDto> {
		const client = await this.keycloak.adminClient();
		const user = await this.findUserById(client, id);
		const roles = await this.getUserRealmRoles(client, id);
		const response = this.toResponse(user, roles);
		if (!response) {
			throw new NotFoundException('Usuario sin rol asignado en el sistema');
		}
		return response;
	}

	async updateUser(
		id: string,
		dto: UpdateUserDto,
		caller: AuthenticatedUser,
	): Promise<UserResponseDto> {
		if (dto.nombre === undefined && dto.activo === undefined) {
			throw new BadRequestException('Debes enviar al menos nombre o activo');
		}

		const client = await this.keycloak.adminClient();
		const existing = await this.findUserById(client, id);
		const roles = await this.getUserRealmRoles(client, id);
		const targetRole = this.resolveSystemRole(roles);
		this.assertCanManageTarget(caller, targetRole);

		const payload: Partial<KeycloakUser> = {};
		if (dto.nombre !== undefined) {
			const { firstName, lastName } = this.splitNombre(dto.nombre);
			payload.firstName = firstName;
			payload.lastName = lastName;
		}
		if (dto.activo !== undefined) {
			payload.enabled = dto.activo;
		}

		const response = await client.put(`/users/${encodeURIComponent(id)}`, {
			...existing,
			...payload,
		});
		if (response.status !== 204) {
			this.throwUpstream('actualizar usuario', response);
		}

		const userRes = await this.getUserById(id);

		try {
			this.client.emit('usuario.creado_o_actualizado', {
				id: userRes.id,
				correo: userRes.correo,
				nombre: userRes.nombre,
				rol: userRes.rol,
			});
			this.logger.log(`Usuario actualizado emitido a la cola: ${userRes.correo}`);
		} catch (error: any) {
			this.logger.error(`Error emitiendo usuario actualizado a la cola: ${error.message}`);
		}

		return userRes;
	}

	async deleteUser(id: string, caller: AuthenticatedUser): Promise<void> {
		const client = await this.keycloak.adminClient();
		const existing = await this.findUserById(client, id);
		const roles = await this.getUserRealmRoles(client, existing.id);
		const targetRole = this.resolveSystemRole(roles);
		this.assertCanManageTarget(caller, targetRole);

		const response = await client.delete(`/users/${encodeURIComponent(id)}`);
		if (response.status === 404) {
			throw new NotFoundException('Usuario no encontrado');
		}
		if (response.status !== 204) {
			this.throwUpstream('eliminar usuario', response);
		}
	}

	// ─── Reglas de autorizacion ─────────────────────────────────────────────────

	private assertCanAssignRole(caller: AuthenticatedUser, role: CreatableRole): void {
		if (role === ADMIN && !caller.roles.includes(SUPERADMIN)) {
			throw new ForbiddenException(
				'Solo un superadmin puede crear administradores',
			);
		}
	}

	/**
	 * Reglas:
	 *  - superadmin: puede operar sobre admin y operador.
	 *  - admin (no superadmin): solo puede operar sobre operador.
	 *  - nadie puede operar sobre otro superadmin via este microservicio.
	 */
	private assertCanManageTarget(
		caller: AuthenticatedUser,
		targetRole: SystemRole | null,
	): void {
		if (targetRole === SUPERADMIN) {
			throw new ForbiddenException(
				'Los superadmin no pueden ser gestionados desde este microservicio',
			);
		}

		const isSuperadmin = caller.roles.includes(SUPERADMIN);
		if (isSuperadmin) return;

		if (targetRole === ADMIN) {
			throw new ForbiddenException(
				'Solo un superadmin puede modificar administradores',
			);
		}
		if (targetRole !== OPERADOR) {
			throw new ForbiddenException(
				'Solo se permite modificar usuarios con rol operador',
			);
		}
	}

	// ─── Helpers Keycloak ───────────────────────────────────────────────────────

	private async findUserById(
		client: AxiosInstance,
		id: string,
	): Promise<KeycloakUser> {
		const response = await client.get<KeycloakUser>(
			`/users/${encodeURIComponent(id)}`,
		);
		if (response.status === 404) {
			throw new NotFoundException('Usuario no encontrado');
		}
		if (response.status !== 200) {
			this.throwUpstream('consultar usuario', response);
		}
		return response.data;
	}

	private async getUserRealmRoles(
		client: AxiosInstance,
		userId: string,
	): Promise<string[]> {
		const response = await client.get<KeycloakRole[]>(
			`/users/${encodeURIComponent(userId)}/role-mappings/realm`,
		);
		if (response.status !== 200) {
			this.throwUpstream('consultar roles del usuario', response);
		}
		return (response.data ?? []).map((role) => role.name);
	}

	private async assignRealmRole(
		client: AxiosInstance,
		userId: string,
		roleName: CreatableRole,
	): Promise<void> {
		const availableResp = await client.get<KeycloakRole[]>(
			`/users/${encodeURIComponent(userId)}/role-mappings/realm/available`,
		);
		if (availableResp.status !== 200) {
			this.throwUpstream('consultar roles disponibles', availableResp);
		}

		const role = (availableResp.data ?? []).find((r) => r.name === roleName);
		if (!role) {
			throw new BadRequestException(
				`El rol "${roleName}" no existe en el realm o ya esta asignado al usuario`,
			);
		}

		const assignResp = await client.post(
			`/users/${encodeURIComponent(userId)}/role-mappings/realm`,
			[{ id: role.id, name: role.name }],
		);
		if (assignResp.status !== 204) {
			this.throwUpstream('asignar rol al usuario', assignResp);
		}
	}

	private extractUserIdFromLocation(location?: string): string | null {
		if (!location) return null;
		const segments = location.split('/').filter(Boolean);
		return segments[segments.length - 1] ?? null;
	}

	private splitNombre(nombre: string): { firstName: string; lastName: string } {
		const trimmed = nombre.trim().replace(/\s+/g, ' ');
		const parts = trimmed.split(' ');
		if (parts.length === 1) {
			return { firstName: parts[0], lastName: '' };
		}
		return {
			firstName: parts[0],
			lastName: parts.slice(1).join(' '),
		};
	}

	/**
	 * Identifica el rol del sistema que tiene un usuario (superadmin > admin > operador).
	 * Si tiene varios, gana el de mayor privilegio.
	 */
	private resolveSystemRole(roles: string[]): SystemRole | null {
		if (roles.includes(SUPERADMIN)) return SUPERADMIN;
		if (roles.includes(ADMIN)) return ADMIN;
		if (roles.includes(OPERADOR)) return OPERADOR;
		return null;
	}

	private toResponse(user: KeycloakUser, roles: string[]): UserResponseDto | null {
		const rol = this.resolveSystemRole(roles);
		if (!rol) return null;

		const nombre = [user.firstName, user.lastName]
			.filter((part) => part && part.trim().length > 0)
			.join(' ')
			.trim();

		return {
			id: user.id,
			nombre,
			correo: user.email ?? user.username,
			rol,
			activo: user.enabled,
		};
	}

	private throwUpstream(action: string, response: AxiosResponse): never {
		this.logger.error(
			`Keycloak respondio ${response.status} al intentar ${action}: ${JSON.stringify(response.data)}`,
		);
		throw new InternalServerErrorException(`No fue posible ${action}`);
	}
}

// Marca SYSTEM_ROLES como usado para que tree-shaking no lo elimine si los DTOs no lo importan en runtime.
void SYSTEM_ROLES;
