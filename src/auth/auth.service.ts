import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthPayLoad } from './dto/auth.dto';


const fakeUsers = [
  {
    id: 1,
    username: 'hoang',
    password: '123456',
    role: 'admin'
  },
  {
    id: 2,
    username: 'anh',
    password: '123456',
    role: 'user'
  }
]

@Injectable()
export class AuthService {
  constructor(private jtwService: JwtService) { }

  validateUser({ username, password }: AuthPayLoad) {
    const findUser = fakeUsers.find((user) => user.username === username);
    if (!findUser) return null;
    if (password === findUser.password) {
        const { password, ...user } = findUser;
        return user; // Trả về thông tin người dùng, bao gồm cả role(ko co mat khau)
    }
    return null;
}


  generateToken(user: any) {
    return this.jtwService.sign({
      username: user.username,
      role: user.role  // Bao gồm role trong token
    });
  }
}