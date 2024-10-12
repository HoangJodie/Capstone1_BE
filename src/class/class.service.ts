/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Renamedclass } from '@prisma/client';

@Injectable()
export class ClassService {
  constructor(private prisma: DatabaseService) { }

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
          class_type: class_type,
          start_date: start_date,
          end_date: end_date,
          fee: fee,
        },
      });
      return newClass;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Unable to add class.');
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
          class_type: class_type,
          start_date: start_date,
          end_date: end_date,
          fee: fee,
        },
      });
      return updatedClass;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Unable to update class.');
    }
  }

  // Xóa một lớp
  async deleteClass(class_id: number): Promise<Renamedclass> {
    try {
      return await this.prisma.renamedclass.delete({
        where: { class_id },
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Unable to delete class.');
    }
  }

  // Lấy thông tin lớp
  async getClassInfo(class_id: number): Promise<any> {
    try {
      const result = await this.prisma.renamedclass.findUnique({
        where: { class_id: class_id },
        select: {
          class_name: true,
          class_description: true,
          status_id: true,
          class_type: true,
          start_date: true,
          end_date: true,
          fee: true,
        },
      });

      if (!result) {
        throw new NotFoundException('Class not found.');
      }
      return result; // Trả về thông tin lớp
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Unable to fetch class info.');
    }
  }

  // Lấy class và tất cả schedule của nó
  async getClass(class_id: number): Promise<any> {
    try {
      const result: any[] = await this.prisma.$queryRaw`
          CALL GetClassAndScheduleByClassOrScheduleID(${class_id}, null);
      `;

      if (result.length === 0) {
        throw new NotFoundException('Class or schedule not found.');
      }

      const classData = result[0];
      const schedules = result.map(schedule => ({
        days: schedule.f7,
        start_hour: schedule.f8,
        end_hour: schedule.f9,
      }));

      return {
        class_name: classData.f0,
        class_description: classData.f1,
        status_id: classData.f2,
        class_type: classData.f3,
        start_date: classData.f4,
        end_date: classData.f5,
        fee: classData.f6,
        schedules: schedules,
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Unable to fetch class and schedules.');
    }
  }

  // Lấy tất cả lớp
  async getAllClass(): Promise<Renamedclass[]> {
    try {
      return await this.prisma.renamedclass.findMany();
    } catch (error) {
      console.error('Error fetching classes:', error);
      throw new InternalServerErrorException('Unable to fetch classes.');
    }
  }
}
