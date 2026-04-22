import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { UsersService } from './users.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) { }

	@Public()
	@Post()
	createUser(@Body() body: CreateUserDto) {
		return this.usersService.createUser(body);
	}

	@Get(':correo')
	getUserByCorreo(@Param('correo') correo: string) {
		return this.usersService.getUserByCorreo(correo);
	}
}
