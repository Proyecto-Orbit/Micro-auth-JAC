import {
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { UsuarioEntity } from './usuario.entity';

export enum CambioEstado {
	PENDIENTE = 'pendiente',
	APROBADO = 'aprobado',
	RECHAZADO = 'rechazado',
}

@Entity({ name: 'cambio' })
export class CambioEntity {
	@PrimaryGeneratedColumn({ type: 'int' })
	id!: number;

	@ManyToOne(() => UsuarioEntity, (usuario) => usuario.cambiosCreados, {
		nullable: false,
	})
	@JoinColumn({
		name: 'usuario_creador_correo',
		referencedColumnName: 'correo',
	})
	usuarioCreador!: UsuarioEntity;

	@ManyToOne(() => UsuarioEntity, (usuario) => usuario.cambiosAprobados, {
		nullable: true,
	})
	@JoinColumn({
		name: 'usuario_aprueba_correo',
		referencedColumnName: 'correo',
	})
	usuarioAprueba!: UsuarioEntity | null;

	@Column({ name: 'tabla_afectada', type: 'varchar', length: 100 })
	tablaAfectada!: string;

	@Column({ name: 'datos_anteriores', type: 'json' })
	datosAnteriores!: unknown;

	@Column({ name: 'datos_nuevos', type: 'json' })
	datosNuevos!: unknown;

	@Column({
		type: 'enum',
		enum: CambioEstado,
		enumName: 'cambio_estado_enum',
		default: CambioEstado.PENDIENTE,
	})
	estado!: CambioEstado;

	@Column({ type: 'varchar', length: 500 })
	observaciones!: string;

	@Column({ name: 'fecha_creacion', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	fechaCreacion!: Date;

	@Column({ name: 'fecha_aprobacion', type: 'timestamp', nullable: true })
	fechaAprobacion!: Date | null;
}
