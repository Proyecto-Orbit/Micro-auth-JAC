import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
	imports: [
		ClientsModule.registerAsync([
			{
				name: 'USUARIOS_PRODUCER',
				useFactory: () => ({
					transport: Transport.RMQ,
					options: {
						urls: [process.env.RABBITMQ_URL ?? 'amqp://localhost:5672'],
						queue: 'colaUsuariosSistema',
						queueOptions: {
							durable: false,
						},
					},
				}),
			},
		]),
	],
	controllers: [UsersController],
	providers: [UsersService],
})
export class UsersModule {}
