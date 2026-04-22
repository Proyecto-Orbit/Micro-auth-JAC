import { Module } from '@nestjs/common';
import { AccessDataModule } from '../access-data/access-data.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ProductorUsuariosService } from './colaDeMensajes/productor-usuarios.service';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
	imports: [AccessDataModule, ClientsModule.register([
		{
			name: 'RABBITMQ_USUARIOS_CLIENT',
			transport: Transport.RMQ,
			options: {
				urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
				queue: 'colaUsuariosSistema',
				queueOptions: {
					durable: false,
				},
			},
		},
	]),],
	controllers: [UsersController],
	providers: [UsersService, ProductorUsuariosService],
	exports: [UsersService, ProductorUsuariosService],
})
export class UsersModule { }
