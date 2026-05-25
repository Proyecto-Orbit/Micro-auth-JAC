import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	InternalServerErrorException,
	NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { KeycloakAdminService } from '../keycloak/keycloak-admin.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import type { CreateUserDto } from './dtos/create-user.dto';

/**
 * Pruebas unitarias caja blanca del UsersService.
 *
 * Estrategia:
 *  - Mockeamos KeycloakAdminService.adminClient() devolviendo un cliente HTTP fake
 *    con jest.fn() en get/post/put/delete para controlar las respuestas de Keycloak.
 *  - Verificamos las ramas de autorizacion (assertCanAssignRole, assertCanManageTarget),
 *    la resolucion de rol del sistema (resolveSystemRole) y los caminos de error
 *    (404, 409, rollback, etc.).
 */

type FakeClient = {
	get: jest.Mock;
	post: jest.Mock;
	put: jest.Mock;
	delete: jest.Mock;
};

const callerAdmin: AuthenticatedUser = {
	sub: 'caller-admin',
	roles: ['admin'],
};
const callerSuperadmin: AuthenticatedUser = {
	sub: 'caller-super',
	roles: ['superadmin'],
};
const okStatus = (data: unknown = {}, headers: Record<string, string> = {}) => ({
	status: 200,
	data,
	headers,
});
const noContent = () => ({ status: 204, data: undefined, headers: {} });
const created = (headers: Record<string, string> = {}) => ({
	status: 201,
	data: undefined,
	headers,
});

function buildFakeClient(): FakeClient {
	return {
		get: jest.fn(),
		post: jest.fn(),
		put: jest.fn(),
		delete: jest.fn(),
	};
}

function buildService(client: FakeClient): UsersService {
	const keycloak = {
		adminClient: jest.fn().mockResolvedValue(client),
	} as unknown as KeycloakAdminService;
	const clientProxy = {
		emit: jest.fn(),
	} as any;
	return new UsersService(keycloak, clientProxy);
}

describe('UsersService', () => {
	beforeEach(() => {
		// Silenciamos los Logger.error que el servicio emite en rutas de error.
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	// ───────────────────────────────────────────────────────────────────────────
	// listUsers
	// ───────────────────────────────────────────────────────────────────────────
	describe('listUsers', () => {
		it('mapea los usuarios y filtra los que no tienen rol del sistema', async () => {
			const client = buildFakeClient();
			client.get.mockImplementation((url: string) => {
				if (url === '/users') {
					return Promise.resolve(
						okStatus([
							{ id: 'u1', username: 'a@x', email: 'a@x', firstName: 'A', lastName: 'X', enabled: true },
							{ id: 'u2', username: 'b@x', email: 'b@x', firstName: 'B', lastName: 'Y', enabled: false },
							{ id: 'u3', username: 'svc', enabled: true },
						]),
					);
				}
				if (url === '/users/u1/role-mappings/realm') return Promise.resolve(okStatus([{ name: 'admin' }]));
				if (url === '/users/u2/role-mappings/realm') return Promise.resolve(okStatus([{ name: 'operador' }]));
				if (url === '/users/u3/role-mappings/realm') return Promise.resolve(okStatus([{ name: 'uma_authorization' }]));
				return Promise.reject(new Error(`Unexpected GET ${url}`));
			});

			const service = buildService(client);
			const result = await service.listUsers();

			expect(result).toHaveLength(2);
			expect(result.map((u) => u.id)).toEqual(['u1', 'u2']);
			expect(result[0]).toMatchObject({ rol: 'admin', activo: true, nombre: 'A X' });
			expect(result[1]).toMatchObject({ rol: 'operador', activo: false });
		});

		it('lanza InternalServerErrorException si Keycloak responde error en /users', async () => {
			const client = buildFakeClient();
			client.get.mockResolvedValue({ status: 500, data: { error: 'kc down' }, headers: {} });
			const service = buildService(client);

			await expect(service.listUsers()).rejects.toBeInstanceOf(InternalServerErrorException);
		});
	});

	// ───────────────────────────────────────────────────────────────────────────
	// createUser
	// ───────────────────────────────────────────────────────────────────────────
	describe('createUser', () => {
		const baseDto: CreateUserDto = {
			correo: 'NUEVO@example.com',
			nombre: 'Nuevo',
			apellido: 'Operador',
			rol: 'operador',
			passwordTemporal: 'Secreto12!',
		};

		it('rechaza con ForbiddenException si un admin intenta crear un admin', async () => {
			const client = buildFakeClient();
			const service = buildService(client);

			await expect(
				service.createUser({ ...baseDto, rol: 'admin' }, callerAdmin),
			).rejects.toBeInstanceOf(ForbiddenException);

			// No debe haber tocado Keycloak.
			expect(client.post).not.toHaveBeenCalled();
		});

		it('permite a un superadmin crear un admin', async () => {
			const client = buildFakeClient();
			const userId = 'new-id-123';
			client.post.mockImplementation((url: string) => {
				if (url === '/users') {
					return Promise.resolve(created({ location: `http://kc/admin/realms/x/users/${userId}` }));
				}
				if (url.endsWith('/role-mappings/realm')) {
					return Promise.resolve(noContent());
				}
				return Promise.reject(new Error(`Unexpected POST ${url}`));
			});
			client.get.mockImplementation((url: string) => {
				if (url === `/users/${userId}/role-mappings/realm/available`) {
					return Promise.resolve(okStatus([{ id: 'role-admin', name: 'admin' }]));
				}
				if (url === `/users/${userId}`) {
					return Promise.resolve(
						okStatus({
							id: userId,
							username: 'nuevo@example.com',
							email: 'nuevo@example.com',
							firstName: 'Nuevo',
							lastName: 'Operador',
							enabled: true,
						}),
					);
				}
				if (url === `/users/${userId}/role-mappings/realm`) {
					return Promise.resolve(okStatus([{ name: 'admin' }]));
				}
				return Promise.reject(new Error(`Unexpected GET ${url}`));
			});

			const service = buildService(client);
			const result = await service.createUser({ ...baseDto, rol: 'admin' }, callerSuperadmin);

			expect(result).toMatchObject({ id: userId, rol: 'admin', activo: true });
			// Verificamos que se mando el credential temporary=true.
			const createCall = client.post.mock.calls.find(([url]) => url === '/users');
			expect(createCall?.[1]).toMatchObject({
				username: 'nuevo@example.com',
				email: 'nuevo@example.com',
				firstName: 'Nuevo',
				lastName: 'Operador',
				credentials: [{ type: 'password', value: 'Secreto12!', temporary: true }],
				requiredActions: ['UPDATE_PASSWORD'],
			});
		});

		it('lanza ConflictException si Keycloak responde 409 al crear', async () => {
			const client = buildFakeClient();
			client.post.mockResolvedValue({ status: 409, data: {}, headers: {} });
			const service = buildService(client);

			await expect(service.createUser(baseDto, callerAdmin)).rejects.toBeInstanceOf(ConflictException);
		});

		it('hace rollback (DELETE) si la asignacion de rol falla luego de crear el usuario', async () => {
			const client = buildFakeClient();
			const userId = 'tmp-id';
			client.post.mockImplementation((url: string) => {
				if (url === '/users') {
					return Promise.resolve(created({ location: `/users/${userId}` }));
				}
				return Promise.reject(new Error(`Unexpected POST ${url}`));
			});
			// El rol "operador" no aparece en available => assignRealmRole lanza BadRequestException.
			client.get.mockResolvedValue(okStatus([]));
			client.delete.mockResolvedValue(noContent());

			const service = buildService(client);

			await expect(service.createUser(baseDto, callerAdmin)).rejects.toBeInstanceOf(
				BadRequestException,
			);
			expect(client.delete).toHaveBeenCalledWith(`/users/${encodeURIComponent(userId)}`);
		});

		it('normaliza el correo a minusculas antes de mandarlo a Keycloak', async () => {
			const client = buildFakeClient();
			const userId = 'u-norm';
			client.post.mockImplementation((url: string) => {
				if (url === '/users') {
					return Promise.resolve(created({ location: `/users/${userId}` }));
				}
				return Promise.resolve(noContent());
			});
			client.get.mockImplementation((url: string) => {
				if (url.endsWith('/role-mappings/realm/available')) {
					return Promise.resolve(okStatus([{ id: 'rid', name: 'operador' }]));
				}
				if (url === `/users/${userId}`) {
					return Promise.resolve(
						okStatus({ id: userId, username: 'nuevo@example.com', email: 'nuevo@example.com', enabled: true }),
					);
				}
				if (url === `/users/${userId}/role-mappings/realm`) {
					return Promise.resolve(okStatus([{ name: 'operador' }]));
				}
				return Promise.reject(new Error(`Unexpected GET ${url}`));
			});

			const service = buildService(client);
			await service.createUser(baseDto, callerAdmin);

			const createCall = client.post.mock.calls.find(([url]) => url === '/users');
			expect(createCall?.[1]).toMatchObject({
				username: 'nuevo@example.com',
				email: 'nuevo@example.com',
			});
		});
	});

	// ───────────────────────────────────────────────────────────────────────────
	// updateUser - reglas de autorizacion
	// ───────────────────────────────────────────────────────────────────────────
	describe('updateUser', () => {
		const targetId = 'target-id';

		const setupTargetWithRole = (client: FakeClient, role: string) => {
			client.get.mockImplementation((url: string) => {
				if (url === `/users/${targetId}`) {
					return Promise.resolve(
						okStatus({
							id: targetId,
							username: 't@x',
							email: 't@x',
							firstName: 'T',
							lastName: 'Y',
							enabled: true,
						}),
					);
				}
				if (url === `/users/${targetId}/role-mappings/realm`) {
					return Promise.resolve(okStatus([{ name: role }]));
				}
				return Promise.reject(new Error(`Unexpected GET ${url}`));
			});
		};

		it('lanza BadRequestException si no se envia ningun campo', async () => {
			const client = buildFakeClient();
			const service = buildService(client);
			await expect(service.updateUser(targetId, {}, callerAdmin)).rejects.toBeInstanceOf(
				BadRequestException,
			);
		});

		it('bloquea al admin que intenta modificar a un admin', async () => {
			const client = buildFakeClient();
			setupTargetWithRole(client, 'admin');
			const service = buildService(client);

			await expect(
				service.updateUser(targetId, { nombre: 'Nuevo' }, callerAdmin),
			).rejects.toBeInstanceOf(ForbiddenException);
			expect(client.put).not.toHaveBeenCalled();
		});

		it('bloquea cualquier caller cuando el target es superadmin', async () => {
			const client = buildFakeClient();
			setupTargetWithRole(client, 'superadmin');
			const service = buildService(client);

			await expect(
				service.updateUser(targetId, { activo: false }, callerSuperadmin),
			).rejects.toBeInstanceOf(ForbiddenException);
			expect(client.put).not.toHaveBeenCalled();
		});

		it('permite al superadmin actualizar a un admin (nombre + estado)', async () => {
			const client = buildFakeClient();
			let userState = {
				id: targetId,
				username: 't@x',
				email: 't@x',
				firstName: 'Old',
				lastName: 'Name',
				enabled: true,
			};

			client.get.mockImplementation((url: string) => {
				if (url === `/users/${targetId}`) return Promise.resolve(okStatus({ ...userState }));
				if (url === `/users/${targetId}/role-mappings/realm`) {
					return Promise.resolve(okStatus([{ name: 'admin' }]));
				}
				return Promise.reject(new Error(`Unexpected GET ${url}`));
			});
			client.put.mockImplementation((_url: string, body: { firstName?: string; lastName?: string; enabled?: boolean }) => {
				userState = { ...userState, ...body };
				return Promise.resolve(noContent());
			});

			const service = buildService(client);
			const result = await service.updateUser(
				targetId,
				{ nombre: 'Juan Perez', activo: false },
				callerSuperadmin,
			);

			expect(client.put).toHaveBeenCalledTimes(1);
			const [, body] = client.put.mock.calls[0];
			expect(body).toMatchObject({ firstName: 'Juan', lastName: 'Perez', enabled: false });
			expect(result).toMatchObject({ id: targetId, rol: 'admin', activo: false });
		});

		it('permite al admin actualizar a un operador', async () => {
			const client = buildFakeClient();
			setupTargetWithRole(client, 'operador');
			client.put.mockResolvedValue(noContent());
			const service = buildService(client);

			await expect(
				service.updateUser(targetId, { nombre: 'Nuevo Nombre' }, callerAdmin),
			).resolves.toBeDefined();
			expect(client.put).toHaveBeenCalledTimes(1);
		});

		it('lanza NotFoundException si el target no existe', async () => {
			const client = buildFakeClient();
			client.get.mockResolvedValue({ status: 404, data: {}, headers: {} });
			const service = buildService(client);

			await expect(
				service.updateUser('missing', { activo: true }, callerSuperadmin),
			).rejects.toBeInstanceOf(NotFoundException);
		});
	});

	// ───────────────────────────────────────────────────────────────────────────
	// deleteUser
	// ───────────────────────────────────────────────────────────────────────────
	describe('deleteUser', () => {
		const targetId = 'd-id';

		it('bloquea al admin que intenta eliminar a un admin', async () => {
			const client = buildFakeClient();
			client.get.mockImplementation((url: string) => {
				if (url === `/users/${targetId}`) {
					return Promise.resolve(okStatus({ id: targetId, username: 't', enabled: true }));
				}
				if (url === `/users/${targetId}/role-mappings/realm`) {
					return Promise.resolve(okStatus([{ name: 'admin' }]));
				}
				return Promise.reject(new Error(`Unexpected GET ${url}`));
			});
			const service = buildService(client);

			await expect(service.deleteUser(targetId, callerAdmin)).rejects.toBeInstanceOf(
				ForbiddenException,
			);
			expect(client.delete).not.toHaveBeenCalled();
		});

		it('permite al superadmin eliminar a un admin', async () => {
			const client = buildFakeClient();
			client.get.mockImplementation((url: string) => {
				if (url === `/users/${targetId}`) {
					return Promise.resolve(okStatus({ id: targetId, username: 't', enabled: true }));
				}
				if (url === `/users/${targetId}/role-mappings/realm`) {
					return Promise.resolve(okStatus([{ name: 'admin' }]));
				}
				return Promise.reject(new Error(`Unexpected GET ${url}`));
			});
			client.delete.mockResolvedValue(noContent());
			const service = buildService(client);

			await service.deleteUser(targetId, callerSuperadmin);
			expect(client.delete).toHaveBeenCalledWith(`/users/${encodeURIComponent(targetId)}`);
		});

		it('lanza NotFoundException si Keycloak responde 404 en DELETE', async () => {
			const client = buildFakeClient();
			client.get.mockImplementation((url: string) => {
				if (url === `/users/${targetId}`) {
					return Promise.resolve(okStatus({ id: targetId, username: 't', enabled: true }));
				}
				if (url === `/users/${targetId}/role-mappings/realm`) {
					return Promise.resolve(okStatus([{ name: 'operador' }]));
				}
				return Promise.reject(new Error(`Unexpected GET ${url}`));
			});
			client.delete.mockResolvedValue({ status: 404, data: {}, headers: {} });
			const service = buildService(client);

			await expect(service.deleteUser(targetId, callerAdmin)).rejects.toBeInstanceOf(
				NotFoundException,
			);
		});

	});

	// ───────────────────────────────────────────────────────────────────────────
	// resolveSystemRole (vía toResponse indirecto en getUserById)
	// ───────────────────────────────────────────────────────────────────────────
	describe('jerarquia de roles (superadmin > admin > operador)', () => {
		it('si un usuario tiene varios roles, devuelve el de mayor privilegio', async () => {
			const client = buildFakeClient();
			client.get.mockImplementation((url: string) => {
				if (url === '/users/multi') {
					return Promise.resolve(
						okStatus({ id: 'multi', username: 'm', firstName: 'M', lastName: 'X', enabled: true }),
					);
				}
				if (url === '/users/multi/role-mappings/realm') {
					return Promise.resolve(
						okStatus([{ name: 'operador' }, { name: 'admin' }, { name: 'superadmin' }]),
					);
				}
				return Promise.reject(new Error(`Unexpected GET ${url}`));
			});

			const service = buildService(client);
			const user = await service.getUserById('multi');
			expect(user.rol).toBe('superadmin');
		});

		it('lanza NotFoundException si el usuario no tiene ningun rol del sistema', async () => {
			const client = buildFakeClient();
			client.get.mockImplementation((url: string) => {
				if (url === '/users/x') {
					return Promise.resolve(okStatus({ id: 'x', username: 'svc', enabled: true }));
				}
				if (url === '/users/x/role-mappings/realm') {
					return Promise.resolve(okStatus([{ name: 'offline_access' }]));
				}
				return Promise.reject(new Error(`Unexpected GET ${url}`));
			});

			const service = buildService(client);
			await expect(service.getUserById('x')).rejects.toBeInstanceOf(NotFoundException);
		});
	});
});
