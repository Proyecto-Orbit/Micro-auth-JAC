# Microservicio de gestión de usuarios (Keycloak)

Microservicio NestJS encargado de la **gestión administrativa de usuarios** del realm de Keycloak para la plataforma JAC. Reemplaza al anterior microservicio de autenticación con Google OAuth 2.0: ahora la autenticación la maneja Keycloak directamente desde el frontend, y este servicio actúa como capa administrativa sobre la **Admin REST API de Keycloak**.

## Responsabilidades

- Crear usuarios en el realm con su rol asignado (`admin` u `operador`).
- Modificar la información personal de operadores.
- Desactivar usuarios (`enabled = false`).
- Eliminar usuarios del realm.

Todas las operaciones se ejecutan contra la Admin REST API usando un **admin access token de servicio** (grant `client_credentials`) que el microservicio obtiene y cachea internamente, refrescándolo automáticamente antes de expirar.

## Arquitectura

```
Frontend (keycloak-js) ──► Authorization: Bearer <access_token>
                              │
                              ▼
                  ┌───────────────────────────┐
                  │   Microservicio (Nest)    │
                  │                           │
                  │  KeycloakAuthGuard        │  ── introspect ──► Keycloak
                  │  RolesGuard (admin)       │
                  │  UsersController          │
                  │  UsersService             │  ── Admin REST API ──► Keycloak
                  │  KeycloakAdminService     │  ── client_credentials ──► Keycloak
                  └───────────────────────────┘
```

- **`KeycloakAuthGuard`** — extrae `Authorization: Bearer <token>`, lo valida vía endpoint de introspección (`/protocol/openid-connect/token/introspect`) y deja `request.user = { sub, username, email, roles }`.
- **`RolesGuard`** — exige que el usuario autenticado tenga alguno de los roles declarados con `@Roles(...)`. Todo el `UsersController` está marcado `@Roles('admin')`.
- **`KeycloakAdminService`** — obtiene y cachea el admin token (client_credentials) y expone un cliente axios preconfigurado con `baseURL = /admin/realms/{realm}` y `Authorization: Bearer` ya inyectado.
- **`UsersService`** — implementa el CRUD contra `/users`, `/users/{id}`, `/roles/{name}` y `/users/{id}/role-mappings/realm`.

## Restricciones de negocio

- **Bearer Token obligatorio**: el JWT viaja siempre como `Authorization: Bearer <token>`. No se usa cookie HTTP-Only.
- **Solo administradores**: todos los endpoints requieren rol `admin` en `realm_access.roles` del token entrante.
- **Modificación restringida a operadores**: `PATCH /users/:id` solo permite editar usuarios que tengan rol `operador`. Si el target es `admin`, responde `403 Forbidden`.

## Endpoints

Base URL: `http://localhost:3000` · Documentación Swagger: `http://localhost:3000/api/docs`

| Método | Ruta              | Descripción                                                          |
| ------ | ----------------- | -------------------------------------------------------------------- |
| GET    | `/usuarios`       | Lista los usuarios del realm con rol `admin` u `operador`.           |
| POST   | `/usuarios`       | Crea un operador. Body: `{ correo, rol: "operador" }`.               |
| PATCH  | `/usuarios/:id`   | Actualiza `nombre` y/o `activo` (solo operadores).                   |
| DELETE | `/usuarios/:id`   | Elimina al usuario del realm de forma permanente.                    |

Todos los endpoints exigen `Authorization: Bearer <access_token>` de un usuario con rol `admin`.

### Formato de respuesta

```json
{
  "id": "uuid",
  "nombre": "Juan Perez",
  "correo": "jperez@example.com",
  "rol": "operador",
  "activo": true
}
```

`nombre` se almacena en Keycloak como `firstName` + `lastName` (split por el primer espacio).
Al crear un operador no se exige contraseña: el usuario debe definirla la primera vez vía
"Olvidé mi contraseña" (el usuario queda con `requiredActions: ["UPDATE_PASSWORD"]`).

## Configuración

Variables de entorno (ver `.env.example`):

| Variable                       | Descripción                                                        |
| ------------------------------ | ------------------------------------------------------------------ |
| `PORT`                         | Puerto HTTP (por defecto `3000`).                                  |
| `ALLOWED_ORIGINS`              | Orígenes CORS permitidos, separados por coma.                      |
| `KEYCLOAK_BASE_URL`            | URL base del servidor Keycloak (ej. `http://localhost:8080`).      |
| `KEYCLOAK_REALM`               | Realm objetivo (ej. `jac-project`).                                |
| `KEYCLOAK_ADMIN_CLIENT_ID`     | Cliente confidencial con service-account habilitado.               |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | Secret del cliente admin.                                          |
| `KEYCLOAK_PUBLIC_CLIENT_ID`    | Cliente público usado por el frontend (`frontend-client`).         |

### Setup requerido en Keycloak

1. Crear un cliente confidencial (ej. `admin-cli-service`) en el realm `jac-project` con **Service Accounts Enabled = ON**.
2. En la pestaña **Service Account Roles** del cliente, asignar del cliente `realm-management` los roles:
   - `manage-users`
   - `query-users`
   - `view-users`
3. Copiar el **Client Secret** a la variable `KEYCLOAK_ADMIN_CLIENT_SECRET`.
4. Asegurar que el realm tenga los roles realm-level `admin` y `operador`.

## Stack

NestJS 11 · TypeScript · axios · class-validator · helmet · @nestjs/throttler · @nestjs/swagger.

El microservicio es **stateless**: no usa base de datos propia ni cola de mensajes. Keycloak es la única fuente de verdad de usuarios.

## Instalación y ejecución

```bash
npm install
cp .env.example .env   # y completar los valores
npm run start:dev
```

## Tests

```bash
npm run test
npm run test:e2e
npm run test:cov
```
