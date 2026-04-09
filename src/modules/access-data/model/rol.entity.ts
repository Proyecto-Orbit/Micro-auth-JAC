import { Check, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UsuarioEntity } from './usuario.entity';

/**
 * RolNombre: Roles permitidos para usuarios del sistema.
 */
export type RolNombre = 'admin' | 'operador';

@Entity({ name: 'rol' })
@Check('CHK_ROL_NOMBRE', `"nombre" IN ('admin', 'operador')`)
/**
 * RolEntity: Entidad que representa los roles disponibles.
 */
export class RolEntity {
	@PrimaryGeneratedColumn({ type: 'int' })
	id!: number;

	@Column({ type: 'varchar', length: 20, unique: true })
	nombre!: RolNombre;

	@OneToMany(() => UsuarioEntity, (usuario) => usuario.rol)
	usuarios!: UsuarioEntity[];
}
