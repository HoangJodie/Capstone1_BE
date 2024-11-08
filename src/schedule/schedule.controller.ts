import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { schedule } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guards';
import { Roles } from 'src/auth/decorators/roles.decorators';
import { Request } from 'express';

@Controller('schedule')
export class ScheduleController {
    constructor(private readonly ScheduleService: ScheduleService) {}


    @Get('pt')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('3')
    async getScheduleForPT(@Req() req, @Query('weekOffset') weekOffset: number = 0) {
        const userId = req.user.user_id; // Giả sử đã có user_id sau khi xác thực
        console.log(`Fetching schedule for PT ID: ${userId}`);
        
        // Tính toán ngày bắt đầu tuần (Thứ Hai)
        const startDate = new Date();
        const currentDay = startDate.getDay();
        const dayOffset = (currentDay === 0) ? -6 : 1 - currentDay; // Nếu là Chủ Nhật, bù lại 6 ngày
        startDate.setDate(startDate.getDate() + dayOffset + (weekOffset * 7));
        console.log(`Start date (Monday): ${startDate.toISOString()}`);
    
        // Ngày kết thúc tuần (Chủ Nhật)
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // Chủ Nhật là 6 ngày sau thứ Hai
        console.log(`End date (Sunday): ${endDate.toISOString()}`);
    
        // Gọi service để lấy lịch trình
        const schedules = await this.ScheduleService.getWeeklySchedule(userId, startDate, endDate);
        console.log(`Schedules fetched: ${JSON.stringify(schedules)}`);
    
        // Trả về dữ liệu theo cấu trúc yêu cầu
        return {
            pt_id: userId, // Đây là userId của PT
            schedules: schedules,
        };
    }
    
    @Get('user')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('2') // Chỉ cho phép user với role 2
    async getScheduleForUser(@Req() req, @Query('weekOffset') weekOffset: number = 0) {
        const userId = req.user.user_id; // Lấy userId từ req sau khi xác thực
        console.log(`Fetching schedule for User ID: ${userId}`);

        // Tính toán ngày bắt đầu của tuần (Thứ Hai)
        const startDate = new Date();
        const currentDay = startDate.getDay();
        const dayOffset = (currentDay === 0) ? -6 : 1 - currentDay; // Nếu là Chủ Nhật, bù lại 6 ngày
        startDate.setDate(startDate.getDate() + dayOffset + (weekOffset * 7));
        console.log(`Start date (Monday): ${startDate.toISOString()}`);

        // Ngày kết thúc của tuần (Chủ Nhật)
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // Chủ Nhật là 6 ngày sau Thứ Hai
        console.log(`End date (Sunday): ${endDate.toISOString()}`);

        // Gọi service để lấy lịch trình
        const schedules = await this.ScheduleService.getUserSchedule(userId, startDate, endDate);
        console.log(`Schedules fetched: ${JSON.stringify(schedules)}`);

        // Trả về dữ liệu theo cấu trúc yêu cầu
        return {
            user_id: userId, // Đây là userId của User
            schedules: schedules,
        };
    }

    

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
