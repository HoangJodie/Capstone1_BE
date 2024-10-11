/* eslint-disable prettier/prettier */
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { schedule } from '@prisma/client';

@Controller('schedule')
export class ScheduleController {
    constructor(private readonly ScheduleService: ScheduleService){}

    //Lấy lịch theo id
    @Get(':id?')
    async getSchedule(@Param('id') schedule_id?: number) {
        return this.ScheduleService.getSchedule(null, schedule_id);
    }

    //Thêm lịch mới
    @Post('addSchedule')
    async addSchedule(@Body() scheduleData: { classId: number; days: string; startHour: Date; endHour: Date })
    {
        try {
            const schedule = await this.ScheduleService.addSchedule(scheduleData.classId, scheduleData.days, scheduleData.startHour, scheduleData.endHour);
            return schedule;
          } catch (error) {
            console.error(error);
            throw error;
          }
    }

    //Sửa lịch
    @Patch(':id') //schedule id ở đây là string
    async editSchedule(@Param('id') scheduleId: string, @Body() scheduleData: { classId: number; days: string; startHour: Date; endHour: Date }) {
        const id = parseInt(scheduleId, 10);
        try {
            const schedule = await this.ScheduleService.editSchedule(id, scheduleData.classId, scheduleData.days, scheduleData.startHour, scheduleData.endHour);
            return schedule;
          } catch (error) {
            console.error(error);
            throw error;
          }
    }

    //Xóa lịch
    @Delete(':id')
    async deleteClass(@Param('id') id: number): Promise<schedule> {
        return this.ScheduleService.deleteSchedule(Number(id));
    }
}
