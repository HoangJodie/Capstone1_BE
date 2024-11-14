import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import * as bcrypt from 'bcryptjs';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class UserService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

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
    // Đầu tiên kiểm tra user và role
    const userCheck = await this.databaseService.user.findUnique({
      where: {
        user_id: id,
      },
      select: {
        role_id: true,
      },
    });

    if (!userCheck) {
      throw new NotFoundException('User not found');
    }

    // Sau đó query lại với các trường phù hợp
    const user = await this.databaseService.user.findUnique({
      where: {
        user_id: id,
      },
      select: {
        user_id: true,
        username: true,
        name: true,
        email: true,
        phoneNum: true,
        // imgurl: true, // tạm thời comment
        role_id: true,
        status_id: true,
        created_at: true,
        updated_at: true,
        ...(userCheck.role_id === 3 ? { PT_introduction: true } : {}), // Chỉ hiển thị PT_introduction nếu là PT
      },
    });

    return user;
  }

  async findByStatus(status_id: number) {
    return this.databaseService.user.findMany({ where: { status_id } });
  }

  async update(id: number, updateUserDto: Prisma.userUpdateInput, file?: Express.Multer.File) {
    // Tìm người dùng hiện tại
    const existingUser = await this.databaseService.user.findUnique({
      where: { user_id: id },
      select: {
        user_id: true,
        username: true,
        name: true,
        email: true,
        phoneNum: true,
        imgurl: true,
        role_id: true,
        status_id: true,
        password: true
      }
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Xử lý upload ảnh nếu có file
    if (file) {
      // Xóa ảnh cũ trên Cloudinary nếu có
      if (existingUser.imgurl) {
        const publicId = existingUser.imgurl.split('/').pop()?.split('.')[0];
        if (publicId) {
          await this.cloudinaryService.deleteImage(publicId);
        }
      }

      // Upload ảnh mới
      const uploadResult = await this.cloudinaryService.uploadImage(file);
      updateUserDto.imgurl = uploadResult.url;
    }

    // Xử lý mật khẩu nếu có
    if (updateUserDto.password) {
      if (typeof updateUserDto.password === 'string') {
        const hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
        updateUserDto.password = hashedPassword;
      }
    } else {
      delete updateUserDto.password;
    }

    // Cập nhật thông tin người dùng
    const updatedUser = await this.databaseService.user.update({
      where: {
        user_id: id,
      },
      data: {
        ...updateUserDto,
        updated_at: new Date(),
      },
      select: {
        user_id: true,
        username: true,
        name: true,
        email: true,
        phoneNum: true,
        imgurl: true,
        role_id: true,
        status_id: true,
        created_at: true,
        updated_at: true,
      }
    });

    return updatedUser;
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
