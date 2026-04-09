import {
	Check,
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
} from 'typeorm';
import { RolEntity } from './rol.entity';

/**
 * UsuarioEstado: Estados permitidos para un usuario.
 */
export type UsuarioEstado = 'activo' | 'inactivo';

@Entity({ name: 'usuario' })
@Check('CHK_USUARIO_ESTADO', `"estado" IN ('activo', 'inactivo')`)
/**
 * UsuarioEntity: Entidad persistente de usuario autenticable.
 */
export class UsuarioEntity {
	@PrimaryColumn({ type: 'varchar', length: 255 })
	correo!: string;

	@ManyToOne(() => RolEntity, (rol) => rol.usuarios, { nullable: false })
	@JoinColumn({ name: 'rol_id', referencedColumnName: 'id' })
	rol!: RolEntity;

	@Column({ type: 'varchar', length: 20 })
	estado!: UsuarioEstado;

	@Column({ type: 'varchar', length: 100 })
	nombre!: string;

	@Column({ type: 'varchar', length: 100 })
	apellido!: string;
}
