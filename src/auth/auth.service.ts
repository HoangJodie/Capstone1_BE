import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthPayLoad } from './dto/auth.dto';
import { DatabaseService } from 'src/database/database.service'; // Sử dụng DatabaseService

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService, private databaseService: DatabaseService) {}

  async validateUser({ username, password }: AuthPayLoad) {
    // Tìm người dùng bằng username
    const user = await this.databaseService.user.findFirst({
      where: { username },
    });
  
    if (!user) return null;
  
    // Kiểm tra mật khẩu
    if (password === user.password) {
      const { password, ...userData } = user;
      return userData; // Trả về thông tin người dùng (không bao gồm mật khẩu)
    }
  
    return null;
  }
  
  

  generateToken(user: any) {
    return this.jwtService.sign({
      user_id: user.user_id,
      username: user.username, // Đảm bảo username có mặt trong payload
      role: user.role_id, // Bao gồm role
    });
  }
  
}
