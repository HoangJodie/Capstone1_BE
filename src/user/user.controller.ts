/* eslint-disable prettier/prettier */
import { Body, Controller, Post, Get, Param, Patch, Delete, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { Prisma } from '@prisma/client';
import { UserDto } from './dto/user.dto';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post()
    async createUser(@Body() userDto: UserDto) {
        try {
            return await this.userService.create(userDto);
        } catch (error) {
            throw new BadRequestException(error.message); // Gửi thông báo lỗi về frontend
        }
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

