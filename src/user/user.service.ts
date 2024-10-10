import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createUserDto: Prisma.userCreateInput) {
    // Kiểm tra nếu username đã tồn tại
    const existingUser = await this.databaseService.user.findUnique({
      where: { username: createUserDto.username }, // Tìm theo username
    });

    // Ném ra lỗi nếu username đã tồn tại
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Tạo user với mật khẩu đã mã hóa
    return this.databaseService.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });
  }

  async findAll() {
    return this.databaseService.user.findMany();
  }

  async findOne(id: number) {
    const user = await this.databaseService.user.findUnique({
      where: {
        user_id: id,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: number, updateUserDto: Prisma.userUpdateInput) {
    const existingUser = await this.databaseService.user.findUnique({
      where: { user_id: id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Kiểm tra nếu password là chuỗi trước khi mã hóa
    if (typeof updateUserDto.password === 'string') {
      const hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
      updateUserDto.password = hashedPassword; // Gán mật khẩu đã mã hóa
    }

    return this.databaseService.user.update({
      where: {
        user_id: id,
      },
      data: updateUserDto,
    });
  }

  async remove(id: number) {
    const existingUser = await this.databaseService.user.findUnique({
      where: { user_id: id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    return this.databaseService.user.delete({
      where: {
        user_id: id,
      },
    });
  }
}
