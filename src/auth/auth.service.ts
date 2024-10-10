import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthPayLoad } from './dto/auth.dto';
import { DatabaseService } from 'src/database/database.service'; // Sử dụng DatabaseService
import * as bcrypt from 'bcryptjs'; // Thêm bcrypt để mã hóa mật khẩu

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService, private databaseService: DatabaseService) {}

  // Kiểm tra người dùng và mật khẩu
  async validateUser({ username, password }: AuthPayLoad) {
    // Tìm người dùng bằng username
    const user = await this.databaseService.user.findFirst({
      where: { username },
    });
  
    if (!user) return null;
  
    // So sánh mật khẩu đã nhập với mật khẩu được mã hóa trong database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null; // Nếu mật khẩu không khớp, trả về null
  
    // Nếu mật khẩu đúng, trả về thông tin người dùng (không bao gồm mật khẩu)
    const { password: _, ...userData } = user;
    return userData;
  }
  
  // Tạo token JWT
  generateToken(user: any) {
    return this.jwtService.sign({
      user_id: user.user_id,
      username: user.username, // Đảm bảo username có mặt trong payload
      role: user.role_id, // Bao gồm role
    });
  }
}
