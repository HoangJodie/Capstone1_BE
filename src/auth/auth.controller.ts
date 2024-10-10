import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalGuard } from './guards/local.guard';
import { JwtAuthGuard } from './guards/jwt.guard';
import { Request } from 'express';
import { Roles } from './decorators/roles.decorators';
import { RolesGuard } from './guards/roles.guards';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // Đăng nhập và tạo token
    @Post('login')
    @UseGuards(LocalGuard)
    async login(@Req() req: Request) {
        const user = req.user; // Lấy thông tin người dùng từ req.user (sau khi xác thực bởi LocalGuard)
        const token = this.authService.generateToken(user); 
        return { token }; // Trả token về cho frontend
    }

    // Lấy thông tin trạng thái người dùng (yêu cầu JWT token)
    @Get('status')
    @UseGuards(JwtAuthGuard)
    async status(@Req() req: Request) {
        return req.user; // Trả về thông tin người dùng từ JWT token
    }

    // Chỉ admin có thể truy cập trang dashboard
    @Get('dashboard')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('1') // Chỉ những người có role_id '1' mới truy cập được
    getAdminDashboard(@Req() req: Request) {
        return  `Welcome to admin dashboard`; // Trả về thông điệp chào mừng
    }
}
