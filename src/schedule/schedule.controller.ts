import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { schedule } from '@prisma/client';

@Controller('schedule')
export class ScheduleController {
    constructor(private readonly ScheduleService: ScheduleService) {}

    // Lấy lịch theo id (không bao gồm thông tin lớp)
    @Get(':id')
    async getSchedule(@Param('id') schedule_id: string) {
        const id = parseInt(schedule_id, 10);
        if (isNaN(id)) {
            throw new HttpException('Invalid schedule_id provided.', HttpStatus.BAD_REQUEST);
        }
        try {
            return await this.ScheduleService.getSchedule(id); // Chỉ gọi hàm getSchedule với schedule_id
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
    }

    // Lấy tất cả lịch của một lớp cụ thể (không bao gồm thông tin lớp)
    @Get('class/:classId')
    async getAllSchedulesByClass(@Param('classId') classId: string) {
        const id = parseInt(classId, 10);
        if (isNaN(id)) {
            throw new HttpException('Invalid classId provided.', HttpStatus.BAD_REQUEST);
        }
        try {
            return await this.ScheduleService.getAllSchedulesByClassId(id); // Gọi service để lấy danh sách lịch
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
    }

    // Thêm lịch mới
    @Post()
    async addSchedule(@Body() scheduleData: { classId: number; days: string; startHour: Date; endHour: Date }) {
        try {
            const schedule = await this.ScheduleService.addSchedule(scheduleData.classId, scheduleData.days, scheduleData.startHour, scheduleData.endHour);
            return schedule;
        } catch (error) {
            console.error(error);
            throw new HttpException('Error adding schedule.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Sửa lịch
    @Patch(':id')
  async editSchedule(
    @Param('id') id: string,
    @Body() scheduleData: { classId: number; days: string; startHour: Date; endHour: Date },
  ) {
    console.log(`Schedule: ${JSON.stringify(scheduleData)}`);
    // You should pass the id and the scheduleData object (not separate parameters)
    return this.ScheduleService.editSchedule(id, scheduleData);
  }

    // Xóa lịch
    @Delete(':id')
    async deleteClass(@Param('id') id: number): Promise<schedule> {
        try {
            return await this.ScheduleService.deleteSchedule(Number(id));
        } catch (error) {
            throw new HttpException('Error deleting schedule.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
