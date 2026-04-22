import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class ProductorUsuariosService {
  constructor(
    @Inject('RABBITMQ_USUARIOS_CLIENT') private readonly rabbitClient: ClientProxy,
  ) {}

  /**
   * Emite el evento a RabbitMQ avisando la creación o actualización de un usuario
   */
  emitirUsuarioCreadoOActualizado(payload: {
    id: string;
    correo: string;
    nombre: string;
    rol: string;
  }) {
    // El patrón debe coincidir exactamente con el consumidor en MS Auditoría
    this.rabbitClient.emit('usuario.creado_o_actualizado', payload);
  }
}
