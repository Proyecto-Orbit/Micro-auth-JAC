import {
	Check,
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
} from 'typeorm';
import { CambioEntity } from './cambio.entity';
import { RolEntity } from './rol.entity';

export type UsuarioEstado = 'activo' | 'inactivo';

@Entity({ name: 'usuario' })
@Check('CHK_USUARIO_ESTADO', `"estado" IN ('activo', 'inactivo')`)
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

	@OneToMany(() => CambioEntity, (cambio) => cambio.usuarioCreador)
	cambiosCreados!: CambioEntity[];

	@OneToMany(() => CambioEntity, (cambio) => cambio.usuarioAprueba)
	cambiosAprobados!: CambioEntity[];
}
