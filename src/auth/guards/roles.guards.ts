import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.get<string[]>('roles', context.getHandler());
        if (!roles) {
            return true; // Nếu không có yêu cầu roles cụ thể, cho phép truy cập
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user; // Lấy user từ request (đã được validate từ JwtStrategy)

        console.log('User:', user); // Log thông tin người dùng
        console.log('Required Roles:', roles); // Log các role yêu cầu

        // Kiểm tra role có phải là một trong các roles yêu cầu không
        return roles.includes(user.role?.toString()); // Sử dụng user.role thay vì user.role_id
    }
}
