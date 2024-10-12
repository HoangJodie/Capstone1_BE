/* eslint-disable prettier/prettier */
import { Controller, Get, Param, Post, Body, Patch, Delete, HttpException, HttpStatus } from '@nestjs/common';
import { ClassService } from './class.service';
import { Renamedclass } from '@prisma/client'; // Sử dụng mô hình Renamedclass

@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) { }

  // Lấy tất cả các lớp
  @Get()
  async getAllClass() {
    try {
      const classes = await this.classService.getAllClass();
      return classes;
    } catch (error) {
      console.error(error);
      throw new HttpException('Unable to fetch classes.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('info/:id')
  async getClassInfo(@Param('id') class_id: string) {
    const id = parseInt(class_id, 10);
    if (isNaN(id)) {
      throw new HttpException('Invalid class_id provided.', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.classService.getClassInfo(id);
    } catch (error) {
      console.error(error);
      throw new HttpException('Class not found.', HttpStatus.NOT_FOUND);
    }
  }

  // Lấy lớp theo ID (gồm cả lịch học)
  @Get(':id')
  async getClass(@Param('id') class_id: string) {
    const id = parseInt(class_id, 10);
    if (isNaN(id)) {
      throw new HttpException('Invalid class_id provided.', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.classService.getClass(id);
    } catch (error) {
      console.error(error);
      throw new HttpException('Class not found.', HttpStatus.NOT_FOUND);
    }
  }

  // Thêm một lớp mới
  @Post()
  async addClass(@Body() classData: { className: string; classDescription: string; classType: number; fee: number; startDate: Date; endDate: Date }) {
    try {
      const newClass = await this.classService.addClass(classData.className, classData.classDescription, classData.classType, classData.fee, classData.startDate, classData.endDate);
      return newClass;
    } catch (error) {
      console.error(error);
      throw new HttpException('Unable to add class.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Sửa một lớp
  @Patch(':id') // class ID ở đây là string
  async editClass(@Param('id') classId: string, @Body() classData: { className: string; classDescription: string; statusId: number; classType: number; startDate: Date; endDate: Date; fee: number }) {
    const id = parseInt(classId, 10); // chuyển string thành int
    if (isNaN(id)) {
      throw new HttpException('Invalid class_id provided.', HttpStatus.BAD_REQUEST);
    }
    try {
      const updatedClass = await this.classService.editClass(id, classData.className, classData.classDescription, classData.statusId, classData.classType, classData.fee, classData.startDate, classData.endDate);
      return updatedClass;
    } catch (error) {
      console.error(error);
      throw new HttpException('Unable to update class.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Xóa một lớp
  @Delete(':id')
  async deleteClass(@Param('id') id: string): Promise<Renamedclass> {
    const classId = parseInt(id, 10);
    if (isNaN(classId)) {
      throw new HttpException('Invalid class_id provided.', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.classService.deleteClass(classId);
    } catch (error) {
      console.error(error);
      throw new HttpException('Unable to delete class.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
