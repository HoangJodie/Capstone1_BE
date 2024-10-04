import { PassportStrategy } from "@nestjs/passport";
import {Strategy} from 'passport-local'
import { AuthService } from "../auth.service";
import { Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(username: string, password: string, role: string) {
    const user = this.authService.validateUser({ username, password, role });
    if (!user) throw new UnauthorizedException();
    return user; // Trả về thông tin người dùng, không trả token ở đây
  }
}
