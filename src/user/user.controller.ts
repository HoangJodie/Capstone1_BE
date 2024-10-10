import { Body, Controller, Post, Get, Param, Patch, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { Prisma } from '@prisma/client';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post()
    createUser(@Body() createUserDTO: Prisma.userCreateInput) {
        return this.userService.create(createUserDTO);
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
    update(@Param('id') id: string, @Body() updateUserDto: Prisma.userUpdateInput) {
        return this.userService.update(+id, updateUserDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.userService.remove(+id);
    }
}

