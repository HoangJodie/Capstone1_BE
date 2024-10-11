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
  ) {
    try {
      const newClass = await this.prisma.renamedclass.create({
        data: {
          class_name: class_name,
          class_description: class_description,
          status_id: 1,
          class_type: class_type, //class_type Invalid value provided. Expected String or Null, provided Int.
          start_date: start_date,
          end_date: end_date,
          fee: fee,
        },
      });
      return newClass;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // Sửa một lớp
  async editClass(
    class_id: number,
    class_name: string,
    class_description: string,
    status_id: number,
    class_type: number,
    fee: number,
    start_date: Date,
    end_date: Date,
  ) {
    try {
      const updatedClass = await this.prisma.renamedclass.update({
        where: { class_id: class_id },
        data: {
          class_name: class_name,
          class_description: class_description,
          status_id: status_id,  
          class_type: class_type, //class_type Invalid value provided. Expected String or Null, provided Int.
          start_date: start_date,
          end_date: end_date,
          fee: fee,
        },
      });
      return updatedClass;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // Xóa một lớp
  async deleteClass(class_id: number): Promise<Renamedclass> {
    return this.prisma.renamedclass.delete({
      where: { class_id }, // Sử dụng class_id làm khóa
    });
  }

  // Lấy lớp (theo ID)
  async getClass(class_id?: number, schedule_id?: number): Promise<Renamedclass> {
    if (class_id) {
      return this.prisma.$queryRaw`
        CALL GetClassAndScheduleByClassOrScheduleID(${class_id}, NULL);
      `;
    } else if (schedule_id) {
      return this.prisma.$queryRaw`
        CALL GetClassAndScheduleByClassOrScheduleID(NULL, ${schedule_id});
      `;
    } else {
      throw new Error('Must provide either class_id or schedule_id');
    }
  }

  //Lấy tất cả lớp
  async getAllClass(): Promise<Renamedclass[]>{
    try {
        const classes = await this.prisma.renamedclass.findMany();
        return classes;
    } catch (error) {
        console.error('Error fetching classes:', error);
        throw new Error('Unable to fetch classes.');
    }
  }
}
