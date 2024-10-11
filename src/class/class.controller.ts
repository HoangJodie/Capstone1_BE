/* eslint-disable prettier/prettier */
import { Controller, Get, Param, Post, Body, Patch, Delete } from '@nestjs/common';
import { ClassService } from './class.service';
import { Renamedclass } from '@prisma/client'; // Sử dụng mô hình Renamedclass

@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  // Lấy lớp theo ID
  @Get(':id?')
  async getClass(@Param('id') class_id?: number) {
    return this.classService.getClass(class_id, null);
  }

  //Lấy tất cả các lớp
  @Get()
  async getAllClass() {
    try {
      const classes = await this.getAllClass();
      console.log(classes);
    } catch (error) {
        console.error(error);
    }
  }

  // Thêm một lớp mới
  @Post('addClass')
  async addClass(@Body() classData: { className: string; classDescription: string; classType: number; fee: number; startDate: Date; endDate: Date}) {
    try {
      const newClass = await this.classService.addClass(classData.className, classData.classDescription, classData.classType, classData.fee, classData.startDate, classData.endDate);
      return newClass;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // Sửa một lớp
  @Patch(':id') //classs id ở đây là string
  async editClass(@Param('id') classId: string, @Body() classData: { className: string; classDescription: string; statusId: number; classType: number; startDate: Date; endDate: Date; fee: number }) {
    const id = parseInt(classId, 10) // chuyển string thành int
    try {
      const updatedClass = await this.classService.editClass(id, classData.className, classData.classDescription, classData.statusId, classData.classType, classData.fee, classData.startDate, classData.endDate);
      return updatedClass;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // Xóa một lớp
  @Delete(':id')
  async deleteClass(@Param('id') id: number): Promise<Renamedclass> {
    return this.classService.deleteClass(Number(id));
  }

}
