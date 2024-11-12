/* eslint-disable prettier/prettier */
import { Body, Controller, Post, Get, Param, Patch, Delete, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { Prisma } from '@prisma/client';
import { UserDto } from './dto/user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Request } from 'express';
import { RolesGuard } from 'src/auth/guards/roles.guards';
import { Roles } from 'src/auth/decorators/roles.decorators';

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

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    async getProfile(@Req() req: Request) {
        const userId = req.user['user_id']; // Lấy user_id từ JWT payload
        return this.userService.findOne(userId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.userService.findOne(+id);
    }

    @Get('status/:statusId')
    findByStatus(@Param('statusId') statusId: string) {
        return this.userService.findByStatus(+statusId);
    }
    
    @Patch('profile')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('image'))
    async updateProfile(
        @Req() req: Request,
        @Body() userDto: UserDto,
        @UploadedFile() file?: Express.Multer.File
    ) {
        try {
            const userId = req.user['user_id'];
            return await this.userService.update(userId, userDto, file);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('1') // Chỉ admin mới có thể cập nhật thông tin của user khác
    @UseInterceptors(FileInterceptor('image'))
    async updateUser(
        @Param('id') id: string,
        @Body() userDto: UserDto,
        @UploadedFile() file?: Express.Multer.File
    ) {
        try {
            return await this.userService.update(+id, userDto, file);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.userService.remove(+id);
    }

}

