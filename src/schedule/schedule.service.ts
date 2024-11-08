import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { schedule } from '@prisma/client';
import { startOfWeek, endOfWeek } from 'date-fns';

@Injectable()
export class ScheduleService {
    constructor(private prisma: DatabaseService) {}

    // Thêm lịch
    async addSchedule(
        class_id: number,
        days: string,
        start_hour: Date,
        end_hour: Date,
    ) {
        try {
            const schedule = await this.prisma.schedule.create({
                data: {
                    class_id: class_id,
                    days,
                    start_hour: start_hour,
                    end_hour: end_hour,
                },
            });
            return schedule;
        } catch (error) {
            console.error(error);
            throw new Error('Unable to add schedule.'); // Ném ra lỗi cụ thể
        }
    }

    // Sửa lịch
    async editSchedule(scheduleId: string, scheduleData: { classId: number; days: string; startHour: Date; endHour: Date }) {
        const id = parseInt(scheduleId, 10);

        if (isNaN(id)) {
        throw new Error('Invalid schedule_id provided.');
        }

        try {
    // Ensure 'days' is a valid ISO-8601 DateTime
        const days = new Date(scheduleData.days); // Ensure it's a valid Date object
        if (isNaN(days.getTime())) {
            throw new Error('Invalid date format for days.');
        }

        const schedule = await this.prisma.schedule.update({
            where: {
            schedule_id: id,
            },
            data: {
            class_id: scheduleData.classId, // Make sure classId is passed correctly
            days: days.toISOString(), // Ensure days is in ISO-8601 format
            start_hour: scheduleData.startHour,
            end_hour: scheduleData.endHour,
            },
        });

        return schedule;
        } catch (error) {
        console.error('Error updating schedule:', error);
        throw new Error('Error updating schedule.');
        }
    }


    // Xóa lịch
    async deleteSchedule(schedule_id: number): Promise<schedule> {
        try {
            return await this.prisma.schedule.delete({
                where: { schedule_id },
            });
        } catch (error) {
            console.error('Error deleting schedule:', error);
            throw new NotFoundException('Schedule not found for deletion.'); // Ném ra lỗi nếu không tìm thấy lịch
        }
    }

    // Lấy lịch (theo ID)
    async getSchedule(schedule_id: number): Promise<schedule> {
        try {
            const schedule = await this.prisma.schedule.findUnique({
                where: { schedule_id: schedule_id },
            });

            if (!schedule) {
                throw new NotFoundException(`Schedule not found for ID: ${schedule_id}`);
            }

            return schedule; // Trả về chỉ thông tin của lịch
        } catch (error) {
            console.error('Error fetching schedule:', error);
            throw new Error('Unable to fetch schedule.'); // Ném ra lỗi cụ thể
        }
    }

    // Lấy tất cả lịch của một lớp cụ thể
    async getAllSchedulesByClassId(class_id: number): Promise<schedule[]> {
        try {
            const schedules = await this.prisma.schedule.findMany({
                where: {
                    class_id: class_id,
                },
            });
            return schedules; // Trả về danh sách lịch
        } catch (error) {
            console.error('Error fetching schedules for class:', error);
            throw new Error('Unable to fetch schedules for the specified class.'); // Ném ra lỗi cụ thể
        }
    }

    async getWeeklySchedule(ptId: number, startDate: Date, endDate: Date) {
        console.log(`Fetching schedule for PT ID: ${ptId}`);
        console.log(`Start date: ${startDate.toISOString()}`);
        console.log(`End date: ${endDate.toISOString()}`);
    
        // Đặt giờ, phút, giây, mili giây về 0 cho startDate
        startDate.setHours(0, 0, 0, 0); 
        // Đặt giờ đến cuối ngày cho endDate
        endDate.setHours(23, 59, 59, 999); 
    
        // Truy vấn bảng user_class để tìm các class_id mà PT (user_id) quản lý
        const managedClasses = await this.prisma.user_class.findMany({
            where: {
                user_id: ptId,
                status_id: 1, // Giả sử status_id = 1 đại diện cho các PT đang quản lý lớp
            },
            select: {
                class_id: true,
            },
        });
    
        // Lấy danh sách class_id mà PT quản lý
        const managedClassIds = managedClasses.map((cls) => cls.class_id);
    
        // Truy vấn bảng schedule để lấy lịch trình của các lớp PT quản lý
        const schedules = await this.prisma.schedule.findMany({
            where: {
                days: {
                    gte: startDate,
                    lte: endDate,
                },
                class_id: {
                    in: managedClassIds,
                },
            },
        });
    
        console.log(`Schedules fetched: ${JSON.stringify(schedules)}`);
    
        // Tiếp tục xử lý lịch trình như trước
        const result = await Promise.all(
            schedules.map(async (schedule) => {
                const classData = await this.prisma.renamedclass.findUnique({
                    where: { class_id: schedule.class_id },
                    select: {
                        class_id: true,
                        class_name: true,
                        class_description: true,
                        start_date: true,
                        end_date: true,
                    },
                });
    
                const studentRegistrations = await this.prisma.user_class.findMany({
                    where: { class_id: schedule.class_id },
                    select: {
                        user_id: true,
                    },
                });
    
                const students = await Promise.all(
                    studentRegistrations.map(async (registration) => {
                        return await this.prisma.user.findUnique({
                            where: { user_id: registration.user_id },
                            select: {
                                user_id: true,
                                username: true,
                                email: true,
                            },
                        });
                    })
                );
    
                const dayOfWeek = schedule.days.getDay();
                const adjustedDayOfWeek = (dayOfWeek + 6) % 7;
    
                return {
                    schedule_id: schedule.schedule_id,
                    class_id: classData?.class_id,
                    class_name: classData?.class_name,
                    class_description: classData?.class_description,
                    start_date: classData?.start_date,
                    end_date: classData?.end_date,
                    date: schedule.days,
                    start_hour: schedule.start_hour,
                    end_hour: schedule.end_hour,
                    students: students,
                    day_of_week: adjustedDayOfWeek,
                };
            })
        );
    
        return result;
    }
    
    async getUserSchedule(userId: number, startDate: Date, endDate: Date) {
        console.log(`Fetching schedule for User ID: ${userId}`);
        console.log(`Start date: ${startDate.toISOString()}`);
        console.log(`End date: ${endDate.toISOString()}`);
    
        // Đặt giờ, phút, giây, mili giây về 0 cho startDate
        startDate.setHours(0, 0, 0, 0); 
        // Đặt giờ đến cuối ngày cho endDate
        endDate.setHours(23, 59, 59, 999); 
    
        // Truy vấn bảng user_class để tìm các class_id mà user tham gia
        const enrolledClasses = await this.prisma.user_class.findMany({
            where: {
                user_id: userId,
                status_id: 1, // Giả sử status_id = 1 đại diện cho user đang tham gia lớp
            },
            select: {
                class_id: true,
            },
        });
    
        // Lấy danh sách class_id mà user tham gia
        const enrolledClassIds = enrolledClasses.map((cls) => cls.class_id);
    
        // Truy vấn bảng schedule để lấy lịch trình của các lớp user tham gia
        const schedules = await this.prisma.schedule.findMany({
            where: {
                days: {
                    gte: startDate,
                    lte: endDate,
                },
                class_id: {
                    in: enrolledClassIds,
                },
            },
        });
    
        console.log(`Schedules fetched: ${JSON.stringify(schedules)}`);
    
        // Tiếp tục xử lý lịch trình như trước
        const result = await Promise.all(
            schedules.map(async (schedule) => {
                const classData = await this.prisma.renamedclass.findUnique({
                    where: { class_id: schedule.class_id },
                    select: {
                        class_id: true,
                        class_name: true,
                        class_description: true,
                        start_date: true,
                        end_date: true,
                    },
                });
    
                const studentRegistrations = await this.prisma.user_class.findMany({
                    where: { class_id: schedule.class_id },
                    select: {
                        user_id: true,
                    },
                });
    
                const students = await Promise.all(
                    studentRegistrations.map(async (registration) => {
                        return await this.prisma.user.findUnique({
                            where: { user_id: registration.user_id },
                            select: {
                                user_id: true,
                                username: true,
                                email: true,
                            },
                        });
                    })
                );
    
                const dayOfWeek = schedule.days.getDay();
                const adjustedDayOfWeek = (dayOfWeek + 6) % 7;
    
                return {
                    schedule_id: schedule.schedule_id,
                    class_id: classData?.class_id,
                    class_name: classData?.class_name,
                    class_description: classData?.class_description,
                    start_date: classData?.start_date,
                    end_date: classData?.end_date,
                    date: schedule.days,
                    start_hour: schedule.start_hour,
                    end_hour: schedule.end_hour,
                    students: students,
                    day_of_week: adjustedDayOfWeek,
                };
            })
        );
    
        return result;
    }
    
    

    
      
      
    
    
}
