import { Test, TestingModule } from '@nestjs/testing';
import {
	BadRequestException,
	InternalServerErrorException,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { AuthService } from './auth.service';
import { UsuarioRepository } from '../access-data/repositories/usuario.repository';


/**
 * jest.mock() reemplaza COMPLETAMENTE el módulo google-auth-library antes de que
 * el servicio sea instanciado. Esto es necesario porque OAuth2Client se crea
 * directamente en el campo de clase (`private readonly googleClient = new OAuth2Client()`).
 * Sin este mock, la prueba intentaría hacer llamadas reales a Google.
 */
jest.mock('google-auth-library');

// ---------------------------------------------------------------------------
// ENFOQUE: Cobertura de Decisión (Branch Coverage)
//
// Cada sentencia `if` tiene dos ramas: verdadera (condición se cumple) y
// falsa (condición no se cumple). Para lograr cobertura de decisión necesitamos
// al menos un caso de prueba que recorra cada rama.
//
// La Cobertura de Sentencias sería insuficiente aquí porque el happy path
// (autenticación exitosa) ejecuta casi todas las líneas, pero nunca probaría
// las rutas de error.  Con Cobertura de Decisión garantizamos que cada `if`
// se evalúa tanto como verdadero como falso en alguna prueba.
//
// Dato curioso: en este caso, los casos de prueba que habria que hacer para cobertura de sentencia y de decisión son exactamente los mismos.
//
// Para la condición compuesta en getSessionFromToken se aplica además un
// caso de Cobertura de Condición Simple, documentado en TC-10.
// ---------------------------------------------------------------------------

describe('AuthService', () => {
	let service: AuthService;
	let usuarioRepository: jest.Mocked<UsuarioRepository>;
	let jwtService: jest.Mocked<JwtService>;
	let mockVerifyIdToken: jest.Mock;

	/**
	 * beforeEach se ejecuta antes de CADA prueba (it/test).
	 * Recrear el módulo en cada prueba asegura que las pruebas sean
	 * independientes entre sí: el estado de un mock no afecta a las demás.
	 */
	beforeEach(async () => {
		mockVerifyIdToken = jest.fn();

		// Cada vez que el código haga `new OAuth2Client()` recibirá este objeto falso
		(OAuth2Client as jest.Mock).mockImplementation(() => ({
			verifyIdToken: mockVerifyIdToken,
		}));

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{
					// En lugar del repositorio real (que necesita base de datos),
					// inyectamos un objeto con funciones simuladas (jest.fn()).
					provide: UsuarioRepository,
					useValue: {
						findByCorreo: jest.fn(),
					},
				},
				{
					// Igual con JwtService: no necesitamos firmar JWTs reales en unit tests.
					provide: JwtService,
					useValue: {
						signAsync: jest.fn(),
						verifyAsync: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<AuthService>(AuthService);
		usuarioRepository = module.get(UsuarioRepository);
		jwtService = module.get(JwtService);
	});

	/**
	 * afterEach limpia el estado global después de cada prueba.
	 * Las variables de entorno son globales al proceso, por lo que si una
	 * prueba las asigna y no se limpian, contaminan las pruebas siguientes.
	 */
	afterEach(() => {
		jest.clearAllMocks();
		delete process.env.GOOGLE_CLIENT_ID;
		delete process.env.JWT_SECRET;
	});

	// ==========================================================================
	// authenticateWithGoogle
	// ==========================================================================
	describe('authenticateWithGoogle', () => {
		// ----------------------------------------------------------------------
		// [IMPLEMENTADO] TC-01
		// Decisión: `if (!credential?.trim())`  →  rama VERDADERA
		//
		// Cuando la credencial está vacía o es solo espacios, el servicio debe
		// rechazar la solicitud inmediatamente sin intentar llamar a Google.
		// No se prueba cuando la credencial es null por la configuracion en tsconfig "strictNullChecks": true.
		// ----------------------------------------------------------------------
		it('debe lanzar BadRequestException cuando la credencial está vacía', async () => {
			// Probamos cadena vacía
			await expect(service.authenticateWithGoogle('')).rejects.toThrow(BadRequestException);
		});

		it('debe lanzar BadRequestException cuando la credencial es solo espacios', async () => {
			// Probamos cadena de espacios (el .trim() la convierte en vacía)
			await expect(service.authenticateWithGoogle('   ')).rejects.toThrow(BadRequestException);
		});

		// ----------------------------------------------------------------------
		// [IMPLEMENTADO] TC-02
		// Decisión: `if (!googleClientId)`  →  rama VERDADERA
		//
		// IMPORTANTE: este `if` está ANTES del bloque try/catch, por lo tanto
		// el InternalServerErrorException llega al llamador sin ser interceptado.
		// Contrasta esto con el check de JWT_SECRET (TC-09), que está DENTRO del
		// try y sí es capturado (ver nota en TC-09).
		// ----------------------------------------------------------------------
		it('debe lanzar InternalServerErrorException cuando GOOGLE_CLIENT_ID no está configurado', async () => {
			// No asignamos process.env.GOOGLE_CLIENT_ID → googleClientId será undefined
			await expect(service.authenticateWithGoogle('alguna-credencial')).rejects.toThrow(
				InternalServerErrorException,
			);
			// Verificamos que nunca se llegó a llamar a Google
			expect(mockVerifyIdToken).not.toHaveBeenCalled();
		});

		// ----------------------------------------------------------------------
		// [IMPLEMENTADO] TC-03 — Happy path
		// Cobertura de sentencias: recorre todas las líneas del camino exitoso.
		// Todas las decisiones toman su rama FALSA (ningún error ocurre).
		//
		// Este test valida que, dado un escenario ideal, el servicio:
		//   1. Verifica el token con Google
		//   2. Busca al usuario en la BD
		//   3. Firma un JWT
		//   4. Retorna la estructura correcta
		// ----------------------------------------------------------------------
		it('debe retornar GoogleAuthWithTokenDto cuando la autenticación es exitosa', async () => {
			process.env.GOOGLE_CLIENT_ID = 'test-client-id';
			process.env.JWT_SECRET = 'test-secret';

			// Simulamos una respuesta válida de Google
			mockVerifyIdToken.mockResolvedValue({
				getPayload: () => ({
					sub: 'google-sub-123',
					name: 'Juan Prueba',
					email: 'juan@example.com',
					email_verified: true,
				}),
			});

			// Simulamos que el usuario existe en la BD con un rol válido
			usuarioRepository.findByCorreo.mockResolvedValue({
				correo: 'juan@example.com',
				rol: { nombre: 'operador' },
			} as any);

			// Simulamos la firma del JWT
			jwtService.signAsync.mockResolvedValue('jwt-token-generado');

			const result = await service.authenticateWithGoogle('credencial-google-valida');

			// Verificamos la estructura completa del resultado
			expect(result).toMatchObject({
				usuario: 'google-sub-123',
				sub: 'google-sub-123',
				nombre: 'Juan Prueba',
				email: 'juan@example.com',
				rol: 'operador',
				token: 'jwt-token-generado',
			});

			// Verificamos que signAsync fue llamado con los parámetros correctos
			expect(jwtService.signAsync).toHaveBeenCalledWith(
				expect.objectContaining({ sub: 'google-sub-123', rol: 'operador' }),
				expect.objectContaining({ expiresIn: '8h' }),
			);
		});

		// ----------------------------------------------------------------------
		// [IMPLEMENTADO] TC-04
		// Decisión: `if (!payload?.sub || !payload?.name)`  →  rama VERDADERA
		// Excepción esperada: UnauthorizedException
		// ----------------------------------------------------------------------
		it('debe lanzar UnauthorizedException cuando el payload de Google no tiene sub', async () => {
			process.env.GOOGLE_CLIENT_ID = 'test-client-id';

			mockVerifyIdToken.mockResolvedValue({
				getPayload: () => ({
					name: 'alguien',
					email: 'x@x.com',
				}),
			});
			
			await expect(service.authenticateWithGoogle('credencial-google-valida')).rejects.toThrow(UnauthorizedException);
		});

		// ----------------------------------------------------------------------
		// [IMPLEMENTADO] TC-05
		// Decisión: `if (payload.email_verified === false)`  →  rama VERDADERA
		// ----------------------------------------------------------------------
		it('debe lanzar UnauthorizedException cuando la cuenta de Google no está verificada', async () => {
			process.env.GOOGLE_CLIENT_ID = 'test-client-id';

			mockVerifyIdToken.mockResolvedValue({
				getPayload: () => ({
					sub: 'sub-valido',
					name: 'test-name',
					email: 'test-email',
					email_verified: false
				}),
			});
			await expect(service.authenticateWithGoogle('credencial-valida')).rejects.toThrow(UnauthorizedException);
		});

		// ----------------------------------------------------------------------
		// [IMPLEMENTADO] TC-06
		// Decisión: `if (!usuario?.rol?.nombre)`  →  rama VERDADERA
		// Excepción esperada: UnauthorizedException
		//
		// CORRECCIÓN: el payload debe tener email_verified: true (no false).
		// Con false, el guard anterior dispara primero y findByCorreo nunca
		// se llega a llamar, haciendo que el mock de null sea letra muerta
		// y la prueba esté verificando el path equivocado.
		// ----------------------------------------------------------------------
		it('debe lanzar UnauthorizedException cuando el usuario no está registrado', async () => {
			process.env.GOOGLE_CLIENT_ID = 'test-client-id';
			mockVerifyIdToken.mockResolvedValue({
				getPayload: () => ({
					sub: 'sub-valido',
					name: 'test-name',
					email: 'test@example.com',
					email_verified: true,  // ← debe ser true para llegar al guard de usuario
				}),
			});
			usuarioRepository.findByCorreo.mockResolvedValue(null);
			await expect(service.authenticateWithGoogle('credencial-valida')).rejects.toThrow(
				UnauthorizedException,
			);
			// Verificamos que findByCorreo sí fue llamado, confirmando que
			// se ejecutó el código correcto y no un guard anterior
			expect(usuarioRepository.findByCorreo).toHaveBeenCalledWith('test@example.com');
		});

		// ----------------------------------------------------------------------
		// [IMPLEMENTADO] TC-07
		// Cobertura del bloque catch: errores no esperados de Google
		//
		// verifyIdToken puede lanzar un Error genérico si el token está
		// corrupto, expirado, o la red falla. El catch lo convierte en
		// UnauthorizedException con un mensaje genérico para no exponer
		// detalles internos al cliente.
		//
		// Verificamos también el mensaje exacto: así nos aseguramos de que
		// fue el catch quien respondió y no otro guard anterior.
		// ----------------------------------------------------------------------
		it('debe lanzar UnauthorizedException cuando verifyIdToken lanza un error inesperado', async () => {
			process.env.GOOGLE_CLIENT_ID = 'test-client-id';
			mockVerifyIdToken.mockRejectedValue(new Error('token corrupto'));

			await expect(service.authenticateWithGoogle('credencial-invalida')).rejects.toThrow(
				'Credencial de Google inválida o expirada',
			);
		});
	});

	// ==========================================================================
	// getSessionFromToken
	// ==========================================================================
	describe('getSessionFromToken', () => {
		// ----------------------------------------------------------------------
		// [IMPLEMENTADO] TC-08
		// Decisión: `if (!token?.trim())`  →  rama VERDADERA
		//
		// Probamos dos casos: token undefined y token vacío.
		// Ambos deben ser rechazados antes de intentar validar nada.
		// ----------------------------------------------------------------------
		it('debe lanzar UnauthorizedException cuando el token no se proporciona', async () => {
			await expect(service.getSessionFromToken(undefined)).rejects.toThrow(
				UnauthorizedException,
			);
		});

		it('debe lanzar UnauthorizedException cuando el token es una cadena vacía', async () => {
			await expect(service.getSessionFromToken('')).rejects.toThrow(UnauthorizedException);
		});

		// ----------------------------------------------------------------------
		// [IMPLEMENTADO] TC-09
		// Decisión: `if (!jwtSecret)`  →  rama VERDADERA
		//
		// A diferencia del check de JWT_SECRET dentro del try de
		// authenticateWithGoogle, aquí el check está ANTES del bloque try
		// (ver auth.service.ts líneas 126-129). Por eso el
		// InternalServerErrorException llega directamente al llamador
		// sin pasar por ningún catch, igual que GOOGLE_CLIENT_ID en el
		// otro método.
		// ----------------------------------------------------------------------
		it('debe lanzar InternalServerErrorException cuando JWT_SECRET no está configurado', async () => {
			// No asignamos JWT_SECRET → jwtSecret será undefined
			await expect(service.getSessionFromToken('mi-token')).rejects.toThrow(
				InternalServerErrorException,
			);
			// Confirmamos que verifyAsync nunca se ejecutó
			expect(jwtService.verifyAsync).not.toHaveBeenCalled();
		});

		// ----------------------------------------------------------------------
		// [IMPLEMENTADO] TC-10
		// Condición compuesta: `!payload?.sub || !payload?.nombre || !this.isValidRole(payload.rol)`
		// Cobertura de Condición Simple: la tercera sub-condición es TRUE (rol inválido)
		//
		// Las otras dos sub-condiciones (!sub, !nombre) son análogas a TC-04.
		// Aquí nos interesa ejercitar isValidRole() con un valor fuera del
		// conjunto permitido {'admin', 'operador', 'usuario'}.
		// ----------------------------------------------------------------------
		it('debe lanzar UnauthorizedException cuando el rol del token no es válido', async () => {
			process.env.JWT_SECRET = 'test-secret';
			jwtService.verifyAsync.mockResolvedValue({
				sub: 'user-sub',
				nombre: 'Juan',
				rol: 'superadmin',  // rol no contemplado en RoleName
				email: 'juan@example.com',
			});

			await expect(service.getSessionFromToken('token-con-rol-invalido')).rejects.toThrow(
				UnauthorizedException,
			);
		});

		// ----------------------------------------------------------------------
		// [IMPLEMENTADO] TC-11 — Happy path de getSessionFromToken
		// Cobertura de sentencias: recorre todas las líneas del camino exitoso.
		// Todas las decisiones toman su rama FALSA (ningún error ocurre).
		//
		// Verificamos tanto la estructura del resultado como que verifyAsync
		// fue llamado con el secret correcto.
		// ----------------------------------------------------------------------
		it('debe retornar los datos de sesión cuando el token JWT es válido', async () => {
			process.env.JWT_SECRET = 'test-secret';
			jwtService.verifyAsync.mockResolvedValue({
				sub: 'user-sub-123',
				nombre: 'Juan Prueba',
				rol: 'admin',
				email: 'juan@example.com',
			});

			const result = await service.getSessionFromToken('token-jwt-valido');

			expect(result).toMatchObject({
				usuario: 'user-sub-123',
				sub: 'user-sub-123',
				nombre: 'Juan Prueba',
				rol: 'admin',
				email: 'juan@example.com',
			});
			expect(jwtService.verifyAsync).toHaveBeenCalledWith(
				'token-jwt-valido',
				expect.objectContaining({ secret: 'test-secret' }),
			);
		});
	});
});
