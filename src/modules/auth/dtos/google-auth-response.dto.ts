export type RoleName = 'admin' | 'operador';

export interface GoogleAuthResponseDto {
  usuario: string;
  rol: RoleName;
  nombre: string;
  email?: string;
  token: string;
}
