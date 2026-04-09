import { SetMetadata } from '@nestjs/common';

/**
 * IS_PUBLIC_KEY: Clave de metadata para marcar rutas publicas.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Public: Decorador para exponer un endpoint sin autenticacion.
 * @returns {MethodDecorator & ClassDecorator} Marca la ruta como publica.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
