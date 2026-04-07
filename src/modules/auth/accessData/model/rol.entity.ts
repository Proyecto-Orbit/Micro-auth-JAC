import { Check, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UsuarioEntity } from './usuario.entity';

export type RolNombre = 'admin' | 'operador';

@Entity({ name: 'rol' })
@Check('CHK_ROL_NOMBRE', `"nombre" IN ('admin', 'operador')`)
export class RolEntity {
	@PrimaryGeneratedColumn({ type: 'int' })
	id!: number;

	@Column({ type: 'varchar', length: 20 })
	nombre!: RolNombre;

	@OneToMany(() => UsuarioEntity, (usuario) => usuario.rol)
	usuarios!: UsuarioEntity[];
}
