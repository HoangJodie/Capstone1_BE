/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guards';
import { DatabaseModule } from 'src/database/database.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    JwtModule.register({
      secret: 'rhehebeheh34635y',
      signOptions: {
        expiresIn: AuthModule.getAccessTokenExpiration(), // Lấy thời gian hết hạn từ phương thức
      },
    }),
    MailerModule.forRoot({
      transport: {
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false
        }
      },
      defaults: {
        from: `"No Reply" <${process.env.GMAIL_USER}>`,
      },
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, RolesGuard],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {
  // Thời gian hết hạn của access token
  static readonly accessTokenExpiration = '5h'; // Thay đổi theo nhu cầu
  // Thời gian hết hạn của refresh token
  static readonly refreshTokenExpiration = '7d'; // Thay đổi theo nhu cầu

  // Cung cấp thời gian cho access token
  static getAccessTokenExpiration() {
    return this.accessTokenExpiration;
  }

  // Cung cấp thời gian cho refresh token
  static getRefreshTokenExpiration() {
    return this.refreshTokenExpiration;
  }
}
