import { Global, Module } from '@nestjs/common';
import { KeycloakAdminService } from './keycloak-admin.service';

/**
 * KeycloakModule: provee acceso global al cliente admin de Keycloak.
 * Marcado @Global para que guards y servicios lo inyecten sin re-importar.
 */
@Global()
@Module({
	providers: [KeycloakAdminService],
	exports: [KeycloakAdminService],
})
export class KeycloakModule {}
