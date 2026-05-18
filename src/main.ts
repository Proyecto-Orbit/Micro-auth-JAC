import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	const config = app.get(ConfigService);

	const allowedOrigins = config
		.get<string>('ALLOWED_ORIGINS', 'http://localhost:5173')
		.split(',')
		.map((origin) => origin.trim())
		.filter((origin) => origin.length > 0);

	app.use(helmet());
	app.enableCors({
		origin: allowedOrigins,
		credentials: false,
	});

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);

	const swaggerConfig = new DocumentBuilder()
		.setTitle('Microservicio de gestion de usuarios (Keycloak)')
		.setDescription(
			'API administrativa que opera sobre el realm de Keycloak via Admin REST API. ' +
				'Todos los endpoints requieren un Bearer access token de un usuario con rol admin.',
		)
		.setVersion('1.0')
		.addBearerAuth()
		.addTag('Usuarios')
		.build();
	const document = SwaggerModule.createDocument(app, swaggerConfig);
	SwaggerModule.setup('api/docs', app, document);

	const port = config.get<number>('PORT', 3000);
	await app.listen(port);
}
void bootstrap();
