import { Body, Controller, Post, Get, Param, Patch, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { Prisma } from '@prisma/client';
import { UserDto } from './dto/user.dto';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post()
    createUser(@Body() userDto: UserDto) {
        return this.userService.create(userDto);
    }

    @Get()
    findAll() {
        return this.userService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.userService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() userDto: UserDto) {
        return this.userService.update(+id, userDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.userService.remove(+id);
    }
}

