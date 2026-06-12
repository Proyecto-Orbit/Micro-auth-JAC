import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, CanActivate } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Reflector } from '@nestjs/core';
import { APP_GUARD } from '@nestjs/core';

import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'uuid-1234',
  username: 'operador1',
  email: 'operador@test.com',
  firstName: 'Juan',
  lastName: 'Pérez',
  enabled: true,
  role: 'operador',
};

const mockUsersService = {
  listUsers: jest.fn().mockResolvedValue([mockUser]),
  createUser: jest.fn().mockResolvedValue(mockUser),
  updateUser: jest.fn().mockResolvedValue({ ...mockUser, firstName: 'Editado' }),
  deleteUser: jest.fn().mockResolvedValue(undefined),
};

// ─── Guard Simplificado ────────────────────────────────────────────────────

@Injectable()
class TestAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>();
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    const tokenParts = authHeader.split(' ');
    const rolSimulado = tokenParts[1];

    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(rolSimulado)) {
      throw new ForbiddenException(`El rol '${rolSimulado}' no tiene permiso`);
    }

    (req as any).user = {
      sub: 'test-user',
      email: `${rolSimulado}@test.com`,
      nombre: `Usuario ${rolSimulado}`,
      role: rolSimulado,
    };

    return true;
  }
}

// ─── Suite de integración ───────────────────────────────────────────────────

describe('UsersController (Integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        Reflector,
        { provide: APP_GUARD, useClass: TestAuthGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Pruebas sin token (401 Unauthorized) ─────────────────────────────────
  
  describe('Pruebas sin token (401)', () => {
    it('GET /usuarios', () => request(app.getHttpServer()).get('/usuarios').expect(401));
    it('POST /usuarios', () => request(app.getHttpServer()).post('/usuarios').send({}).expect(401));
    it('PATCH /usuarios/1', () => request(app.getHttpServer()).patch('/usuarios/1').send({}).expect(401));
    it('DELETE /usuarios/1', () => request(app.getHttpServer()).delete('/usuarios/1').expect(401));
  });

  // ── Pruebas con token (y roles) ─────────────────────────────────────────

  describe('Pruebas con tokens válidos y roles', () => {
    it('GET /usuarios → 200 (como admin)', async () => {
      const res = await request(app.getHttpServer())
        .get('/usuarios')
        .set('Authorization', `Bearer admin`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(mockUsersService.listUsers).toHaveBeenCalledTimes(1);
    });

    it('GET /usuarios → 403 (un operador no puede listar)', async () => {
      await request(app.getHttpServer())
        .get('/usuarios')
        .set('Authorization', `Bearer operador`)
        .expect(403);
    });

    it('POST /usuarios → 201 (como admin)', async () => {
      const res = await request(app.getHttpServer())
        .post('/usuarios')
        .set('Authorization', `Bearer admin`)
        .send({
          email: 'test@test.com',
          firstName: 'Juan',
          lastName: 'Pérez',
          role: 'operador'
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(mockUsersService.createUser).toHaveBeenCalled();
    });

    it('PATCH /usuarios/uuid-1234 → 200 (como admin)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/usuarios/uuid-1234')
        .set('Authorization', `Bearer admin`)
        .send({ firstName: 'Editado' })
        .expect(200);

      expect(res.body.firstName).toBe('Editado');
      expect(mockUsersService.updateUser).toHaveBeenCalled();
    });

    it('DELETE /usuarios/uuid-1234 → 204 (como admin)', async () => {
      await request(app.getHttpServer())
        .delete('/usuarios/uuid-1234')
        .set('Authorization', `Bearer admin`)
        .expect(204);

      expect(mockUsersService.deleteUser).toHaveBeenCalledWith('uuid-1234', expect.any(Object));
    });
  });
});
