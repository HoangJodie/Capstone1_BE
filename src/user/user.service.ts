import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createUserDto: Prisma.userCreateInput) {
    const existingUser = await this.databaseService.user.findUnique({
      where: { username: createUserDto.username },
    });
  
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }
  
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
  
    return this.databaseService.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        role_id: 2, // Thiết lập role_id mặc định
        status_id: 1, // Thiết lập status_id mặc định
        created_at: new Date(), // Thời gian tạo
        updated_at: new Date(), // Thời gian cập nhật
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

  async findByStatus(status_id: number) {
    return this.databaseService.user.findMany({ where: { status_id } });
  }

  async update(id: number, updateUserDto: Prisma.userUpdateInput) {
    // Tìm người dùng hiện tại
    const existingUser = await this.databaseService.user.findUnique({
      where: { user_id: id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Kiểm tra nếu người dùng muốn cập nhật mật khẩu
    if (updateUserDto.password) {
      if (typeof updateUserDto.password === 'string') {
        const hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
        updateUserDto.password = hashedPassword; // Gán mật khẩu đã mã hóa
      }
    } else {
      // Nếu không có mật khẩu mới, giữ nguyên mật khẩu hiện tại
      delete updateUserDto.password;
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
