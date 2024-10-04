import { Controller, Post, Body, HttpException, UseGuards, Get, Req, Res } from '@nestjs/common';
import { AuthPayLoad } from './dto/auth.dto';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LocalGuard } from './guards/local.guard';
import { get } from 'http';
import { JwtAuthGuard } from './guards/jwt.guard';
import { Request } from 'express';
import { Roles } from './decorators/roles.decorators';
import { RolesGuard } from './guards/roles.guards';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @UseGuards(LocalGuard)
    async login(@Req() req: Request) {
        const user = req.user; // Lấy thông tin người dùng từ req.user
        const token = this.authService.generateToken(user); 
        // Tạo token JWT
            
        return { token }; // Trả token về cho frontend
    }


    @Get('status')
    @UseGuards(JwtAuthGuard)
    async status(@Req() req: Request) {
        return req.user
    }

    @Get('dashboard')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin') // Chỉ admin mới có quyền truy cập
    getAdminDashboard(@Req() req) {
        return `Welcome to admin dashboard, ${req.user.username}`;
    }
}
