import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { schedule } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guards';
import { Roles } from 'src/auth/decorators/roles.decorators';
import { Request } from 'express';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

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

    // // Thêm lịch mới
    // @Post()
    // async addSchedule(@Body() scheduleData: { classId: number; days: string; startHour: Date; endHour: Date }) {
    //     try {
    //         const schedule = await this.ScheduleService.addSchedule(scheduleData.classId, scheduleData.days, scheduleData.startHour, scheduleData.endHour);
    //         return schedule;
    //     } catch (error) {
    //         console.error(error);
    //         throw new HttpException('Error adding schedule.', HttpStatus.INTERNAL_SERVER_ERROR);
    //     }
    // }

    // Sửa lịch
    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('3') // Chỉ cho phép PT chỉnh sửa
    async editSchedule(
        @Param('id') scheduleId: string,
        @Body() updateScheduleDto: UpdateScheduleDto,
        @Req() req: Request & { user: { user_id: number } }
    ) {
        const id = parseInt(scheduleId, 10);
        if (isNaN(id)) {
            throw new HttpException('ID lịch không hợp lệ', HttpStatus.BAD_REQUEST);
        }

        try {
            return await this.ScheduleService.editSchedule(
                id,
                updateScheduleDto,
                req.user.user_id
            );
        } catch (error) {
            throw new HttpException(
                error.message || 'Lỗi khi cập nhật lịch',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
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

    // Thêm lịch học theo lớp
    @Post('class/:classId/batch')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('3') // Chỉ cho phép PT tạo lịch
    async addScheduleBatch(
        @Param('classId') classId: string,
        @Body() scheduleData: CreateScheduleDto,
        @Req() req: Request & { user: { user_id: number } }
    ) {
        const id = parseInt(classId, 10);
        if (isNaN(id)) {
            throw new HttpException('ID lớp không hợp lệ', HttpStatus.BAD_REQUEST);
        }

        try {
            return await this.ScheduleService.addScheduleBatch(
                id,
                scheduleData.dayOfWeek,
                new Date(scheduleData.startHour),
                new Date(scheduleData.endHour),
                req.user.user_id
            );
        } catch (error) {
            throw new HttpException(
                error.message || 'Lỗi khi thêm lịch học',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // Thêm endpoint mới
    @Post('check-schedule-conflict')
    @UseGuards(JwtAuthGuard)
    async checkScheduleConflict(
        @Body() scheduleData: {
            user_id: number;
            class_id: number;
        }
    ) {
        try {
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0); // Đặt thời gian về 00:00:00

            // Lấy danh sách các lớp học hiện tại của user có status_id = 2
            const userClasses = await this.ScheduleService.getUserActiveClasses(
                scheduleData.user_id
            );

            // Lấy tất cả lịch học của các lớp mà user đã đăng ký
            const userSchedules = (await this.ScheduleService.getSchedulesForClasses(
                userClasses.map((uc) => uc.class_id)
            )).filter(schedule => {
                const scheduleDate = new Date(schedule.days);
                scheduleDate.setHours(0, 0, 0, 0);
                return scheduleDate >= currentDate;
            });

            // Lấy lịch học của lớp cần kiểm tra
            const classSchedules = (await this.ScheduleService.getAllSchedulesByClassId(
                scheduleData.class_id
            )).filter(schedule => {
                const scheduleDate = new Date(schedule.days);
                scheduleDate.setHours(0, 0, 0, 0);
                return scheduleDate >= currentDate;
            });

            // Mảng lưu trữ các lịch học bị xung đột
            const conflicts = [];

            // Kiểm tra từng lịch của lớp với từng lịch của user
            for (const classSchedule of classSchedules) {
                for (const userSchedule of userSchedules) {
                    const classDate = new Date(classSchedule.days);
                    const userDate = new Date(userSchedule.days);
                    
                    // So sánh ngày (chỉ so sánh năm, tháng, ngày)
                    const isSameDay = 
                        classDate.getFullYear() === userDate.getFullYear() &&
                        classDate.getMonth() === userDate.getMonth() &&
                        classDate.getDate() === userDate.getDate();

                    if (isSameDay) {
                        // Chuyển đổi thời gian sang số phút để so sánh
                        const classStartTime = new Date(classSchedule.start_hour);
                        const classEndTime = new Date(classSchedule.end_hour);
                        const userStartTime = new Date(userSchedule.start_hour);
                        const userEndTime = new Date(userSchedule.end_hour);

                        const classStartMinutes = classStartTime.getHours() * 60 + classStartTime.getMinutes();
                        const classEndMinutes = classEndTime.getHours() * 60 + classEndTime.getMinutes();
                        const userStartMinutes = userStartTime.getHours() * 60 + userStartTime.getMinutes();
                        const userEndMinutes = userEndTime.getHours() * 60 + userEndTime.getMinutes();

                        // Kiểm tra xung đột thời gian
                        const conflict =
                            (classStartMinutes >= userStartMinutes && classStartMinutes < userEndMinutes) ||
                            (classEndMinutes > userStartMinutes && classEndMinutes <= userEndMinutes) ||
                            (classStartMinutes <= userStartMinutes && classEndMinutes >= userEndMinutes);

                        if (conflict) {
                            // Lấy thông tin lớp học hiện tại của user
                            const conflictClassInfo = await this.ScheduleService.getClassInfo(userSchedule.class_id);
                            
                            conflicts.push({
                                existing_class: {
                                    class_id: userSchedule.class_id,
                                    class_name: conflictClassInfo.class_name,
                                    schedule: {
                                        days: userSchedule.days,
                                        start_hour: userSchedule.start_hour,
                                        end_hour: userSchedule.end_hour
                                    }
                                },
                                new_class_schedule: {
                                    days: classSchedule.days,
                                    start_hour: classSchedule.start_hour,
                                    end_hour: classSchedule.end_hour
                                }
                            });
                        }
                    }
                }
            }

            return {
                user_id: scheduleData.user_id,
                class_id: scheduleData.class_id,
                hasConflict: conflicts.length > 0,
                conflicts: conflicts
            };

        } catch (error) {
            throw new HttpException(
                error.message || 'Lỗi khi kiểm tra xung đột lịch học',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // Thêm endpoint mới
    @Post('check-class-schedule-conflict')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('3') // Chỉ cho phép PT kiểm tra
    async checkClassScheduleConflict(
        @Body() scheduleData: {
            class_id: number;
            days: Date;
            start_hour: Date;
            end_hour: Date;
        }
    ) {
        try {
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0); // Đặt thời gian về 00:00:00

            // Lấy danh sách user trong lớp có status_id = 2
            const classUsers = await this.ScheduleService.getActiveClassUsers(
                scheduleData.class_id
            );

            const conflicts = [];
            for (const user of classUsers) {
                const userClasses = await this.ScheduleService.getUserActiveClasses(user.user_id);
                
                // Lọc chỉ lấy lịch từ hiện tại trở đi
                const schedules = (await this.ScheduleService.getSchedulesForClasses(
                    userClasses.map(uc => uc.class_id)
                )).filter(schedule => {
                    const scheduleDate = new Date(schedule.days);
                    scheduleDate.setHours(0, 0, 0, 0);
                    return scheduleDate >= currentDate;
                });

                const conflictSchedules = schedules.filter(schedule => {
                    const scheduleDate = new Date(schedule.days);
                    const scheduleStart = new Date(schedule.start_hour);
                    const scheduleEnd = new Date(schedule.end_hour);

                    const isSameDay = scheduleDate.toDateString() === scheduleData.days.toDateString();

                    if (isSameDay) {
                        return (
                            (scheduleData.start_hour >= scheduleStart && scheduleData.start_hour < scheduleEnd) ||
                            (scheduleData.end_hour > scheduleStart && scheduleData.end_hour <= scheduleEnd) ||
                            (scheduleData.start_hour <= scheduleStart && scheduleData.end_hour >= scheduleEnd)
                        );
                    }
                    return false;
                });

                if (conflictSchedules.length > 0) {
                    const userInfo = await this.ScheduleService.getUserInfo(user.user_id);
                    conflicts.push({
                        user_id: user.user_id,
                        name: userInfo.name,
                        conflicting_schedules: conflictSchedules.map(schedule => ({
                            days: schedule.days,
                            start_hour: schedule.start_hour,
                            end_hour: schedule.end_hour
                        }))
                    });
                }
            }

            return {
                hasConflicts: conflicts.length > 0,
                conflictingUsers: conflicts
            };

        } catch (error) {
            throw new HttpException(
                error.message || 'Lỗi khi kiểm tra lịch học',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
