/**
 * RoleName: Roles permitidos en respuestas de autenticacion.
 */
export type RoleName = 'admin' | 'operador' | 'usuario';

/**
 * GoogleAuthResponseDto: Estructura de respuesta de sesion autenticada.
 */
export interface GoogleAuthResponseDto {
  usuario: string;
  rol: RoleName;
  nombre: string;
  email?: string;
  sub?: string;
}

/**
 * GoogleAuthWithTokenDto: Respuesta de autenticacion que incluye JWT.
 */
export interface GoogleAuthWithTokenDto extends GoogleAuthResponseDto {
  token: string;
}
