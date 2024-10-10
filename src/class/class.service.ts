/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Renamedclass } from '@prisma/client';

@Injectable()
export class ClassService {
  constructor(private prisma: DatabaseService) {}

  // Thêm một lớp mới
  async addClass(
    class_name: string,
    class_description: string,
    class_type: number,
    fee: number,
    start_date: Date,
    end_date: Date,
  ): Promise<Renamedclass> {
    return this.prisma.renamedclass.create({
      data: {
        class_name,
        class_description,
        class_type,
        fee,
        start_date,
        end_date,
      },
    });
  }

  // Sửa một lớp
  async editClass(
    class_id: number,
    class_name: string,
    class_description: string,
    class_type: number,
    fee: number,
    start_date: Date,
    end_date: Date,
  ): Promise<Renamedclass> {
    return this.prisma.renamedclass.update({
      where: { class_id }, // Sử dụng class_id làm khóa
      data: {
        class_name,
        class_description,
        class_type,
        fee,
        start_date,
        end_date,
      },
    });
  }

  // Xóa một lớp
  async deleteClass(class_id: number): Promise<Renamedclass> {
    return this.prisma.renamedclass.delete({
      where: { class_id }, // Sử dụng class_id làm khóa
    });
  }

  // Lấy các lớp (tất cả hoặc theo ID)
  async getClass(class_id?: number): Promise<Renamedclass[]> {
    if (class_id) {
      return this.prisma.renamedclass.findMany({
        where: { class_id }, // Sử dụng class_id làm khóa
      });
    } else {
      return this.prisma.renamedclass.findMany(); // Trả về tất cả các lớp
    }
  }
}
