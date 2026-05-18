import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Roles: restringe el endpoint a usuarios que tengan al menos uno de los roles indicados.
 * Los roles se comparan contra realm_access.roles del access token de Keycloak.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
