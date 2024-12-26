/* eslint-disable prettier/prettier */
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthPayLoad } from './dto/auth.dto';
import { DatabaseService } from 'src/database/database.service'; // Sử dụng DatabaseService
import * as bcrypt from 'bcryptjs'; // Import bcrypt để so sánh mật khẩu đã mã hóa
import { AuthModule } from './auth.module';
import { randomBytes } from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private databaseService: DatabaseService,
    private mailerService: MailerService,
  ) {}

  // Xác thực người dùng và kiểm tra mật khẩu đã mã hóa
  async validateUser({ username, password }: AuthPayLoad) {
    // Tìm người dùng bằng username
    const user = await this.databaseService.user.findFirst({
      where: { username },
    });

    if (!user) return null;

    // So sánh mật khẩu đã nhập với mật khẩu đã mã hóa trong database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null; // Nếu mật khẩu không hợp lệ, trả về null

    const { password: userPassword, ...userData } = user;
    return userData; // Trả v��� thông tin người dùng (không bao gồm mật khẩu)
  }

  // auth.service.ts
  generateTokens(user: any) {
    try {
      const accessToken = this.jwtService.sign(
        {
          user_id: user.user_id,
          username: user.username,
          role: user.role_id,
        },
        { expiresIn: AuthModule.accessTokenExpiration },
      );
  
      const refreshToken = this.jwtService.sign(
        {
          user_id: user.user_id,
          username: user.username,
          role: user.role_id,
        },
        { expiresIn: AuthModule.refreshTokenExpiration },
      );
  
      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Error generating tokens:', error.message);
      throw new Error('Failed to generate tokens');
    }
  }
  

  // Xử lý refresh token
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken); // Xác thực refresh token
      const newAccessToken = this.jwtService.sign(
        {
          user_id: payload.user_id,
          username: payload.username,
          role: payload.role,
        },
        { expiresIn: '15m' }, // Tạo access token mới
      );
      return newAccessToken;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }


  async verifyToken(token: string) {
    try {
      const decoded = await this.jwtService.verify(token);
      return decoded;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  async createPasswordResetToken(email: string) {
    // Kiểm tra email có tồn tại
    const user = await this.databaseService.user.findFirst({
      where: { email },
    });

    if (!user) {
      throw new HttpException(
        'Email không tồn tại trong hệ thống',
        HttpStatus.NOT_FOUND
      );
    }

    // Tạo reset token với JWT
    const resetToken = this.jwtService.sign(
      {
        user_id: user.user_id,
        email: user.email,
        type: 'reset_password'
      },
      {
        expiresIn: '1h',
        secret: process.env.JWT_RESET_SECRET || 'reset-secret-key'
      }
    );

    // Gửi email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Yêu cầu đặt lại mật khẩu',
        html: `
          <h2>Xin chào ${user.username},</h2>
          <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
          <p>Vui lòng click vào link dưới đây để đặt lại mật khẩu:</p>
          <a href="${resetUrl}">Đặt lại mật khẩu</a>
          <p>Link này sẽ hết hạn sau 1 giờ.</p>
          <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        `
      });

      return true;
    } catch (error) {
      throw new HttpException(
        'Không thể gửi email. Vui lòng thử lại sau.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      // Verify token
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_RESET_SECRET || 'reset-secret-key'
      });

      if (payload.type !== 'reset_password') {
        throw new HttpException(
          'Token không hợp lệ',
          HttpStatus.BAD_REQUEST
        );
      }

      // Hash mật khẩu mới
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Cập nhật mật khẩu
      await this.databaseService.user.update({
        where: { user_id: payload.user_id },
        data: {
          password: hashedPassword,
        },
      });

      return true;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new HttpException(
          'Token đã hết hạn',
          HttpStatus.BAD_REQUEST
        );
      }
      throw new HttpException(
        'Token không hợp lệ',
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
