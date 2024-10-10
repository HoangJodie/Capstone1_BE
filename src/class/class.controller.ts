/* eslint-disable prettier/prettier */
import { Controller, Get, Param, Post, Body, Patch, Delete } from '@nestjs/common';
import { ClassService } from './class.service';
import { Renamedclass } from '@prisma/client'; // Sử dụng mô hình Renamedclass

@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  // Lấy tất cả các lớp hoặc lớp theo ID
  @Get(':id?')
  async getClass(@Param('id') id?: number): Promise<Renamedclass[]> {
    return this.classService.getClass(id ? Number(id) : undefined);
  }

  // Thêm một lớp mới
  @Post()
  async addClass(
    @Body('class_name') class_name: string,
    @Body('class_description') class_description: string,
    @Body('class_type') class_type: number,
    @Body('fee') fee: number,
    @Body('start_date') start_date: Date,
    @Body('end_date') end_date: Date,
  ): Promise<Renamedclass> {
    return this.classService.addClass(
      class_name,
      class_description,
      class_type,
      fee,
      start_date,
      end_date,
    );
  }

  // Sửa một lớp
  @Patch(':id')
  async editClass(
    @Param('id') id: number,
    @Body('class_name') class_name: string,
    @Body('class_description') class_description: string,
    @Body('class_type') class_type: number,
    @Body('fee') fee: number,
    @Body('start_date') start_date: Date,
    @Body('end_date') end_date: Date,
  ): Promise<Renamedclass> {
    return this.classService.editClass(
      Number(id),
      class_name,
      class_description,
      class_type,
      fee,
      start_date,
      end_date,
    );
  }

  // Xóa một lớp
  @Delete(':id')
  async deleteClass(@Param('id') id: number): Promise<Renamedclass> {
    return this.classService.deleteClass(Number(id));
  }
}
