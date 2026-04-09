export type RoleName = 'admin' | 'operador' | 'usuario';

export interface GoogleAuthResponseDto {
  usuario: string;
  rol: RoleName;
  nombre: string;
  email?: string;
  sub?: string;
}

export interface GoogleAuthWithTokenDto extends GoogleAuthResponseDto {
  token: string;
}
