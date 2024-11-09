import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { schedule } from '@prisma/client';
import { startOfWeek, endOfWeek } from 'date-fns';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class ScheduleService {
    constructor(private prisma: DatabaseService) {}

    // Sửa lịch
    async editSchedule(
        scheduleId: number,
        updateScheduleDto: UpdateScheduleDto,
        ptId: number
    ) {
        // Kiểm tra lịch tồn tại và PT có quyền chỉnh sửa
        const existingSchedule = await this.prisma.schedule.findFirst({
            where: { schedule_id: scheduleId }
        });

        if (!existingSchedule) {
            throw new NotFoundException('Không tìm thấy lịch học');
        }

        const classInfo = await this.prisma.renamedclass.findFirst({
            where: { class_id: existingSchedule.class_id }
        });

        if (!classInfo || classInfo.pt_id !== ptId) {
            throw new HttpException('Bạn không có quyền chỉnh sửa lịch này', HttpStatus.FORBIDDEN);
        }

        // Lấy tất cả lịch của PT từ các lớp
        const existingSchedules = await this.prisma.schedule.findMany({
            where: {
                AND: [
                    { schedule_id: { not: scheduleId } },  // Loại trừ lịch hiện tại
                    {
                        class_id: {
                            in: await this.prisma.renamedclass.findMany({
                                where: { pt_id: ptId },
                                select: { class_id: true }
                            }).then(classes => classes.map(c => c.class_id))
                        }
                    }
                ]
            }
        });

        const newDate = new Date(updateScheduleDto.days);
        const startTime = new Date(updateScheduleDto.startHour);
        const endTime = new Date(updateScheduleDto.endHour);

        const newStartTime = new Date(newDate.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0));
        const newEndTime = new Date(newDate.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0));

        // Kiểm tra trùng lịch
        for (const schedule of existingSchedules) {
            const existingDate = new Date(schedule.days);
            const existingStart = new Date(existingDate.setHours(
                schedule.start_hour.getHours(),
                schedule.start_hour.getMinutes(),
                0,
                0
            ));
            const existingEnd = new Date(existingDate.setHours(
                schedule.end_hour.getHours(),
                schedule.end_hour.getMinutes(),
                0,
                0
            ));

            if (existingDate.toDateString() === newDate.toDateString() &&
                newStartTime < existingEnd && newEndTime > existingStart) {
                throw new HttpException(
                    `Lịch học bị trùng vào ngày ${newDate.toLocaleDateString('vi-VN')}`,
                    HttpStatus.CONFLICT
                );
            }
        }

        return this.prisma.schedule.update({
            where: { schedule_id: scheduleId },
            data: {
                days: newDate,
                start_hour: newStartTime,
                end_hour: newEndTime
            }
        });
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
            throw new Error('Unable to fetch schedules for the specified class.'); // Ném ra lỗi cụ th
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
    
    async addScheduleBatch(
        classId: number,
        dayOfWeek: number,
        startHour: Date,
        endHour: Date,
        ptId: number
    ) {
        const createdSchedules: schedule[] = [];

        const classInfo = await this.prisma.renamedclass.findUnique({
            where: { class_id: classId }
        });

        const scheduleDates: Date[] = [];
        let currentDate = new Date(classInfo.start_date);
        const jsDayOfWeek = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
        
        while (currentDate <= classInfo.end_date) {
            if (currentDate.getDay() === jsDayOfWeek) {
                scheduleDates.push(new Date(currentDate));
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const existingSchedules = await this.prisma.schedule.findMany({
            where: {
                class_id: {
                    in: await this.prisma.renamedclass.findMany({
                        where: { pt_id: ptId },
                        select: { class_id: true }
                    }).then(classes => classes.map(c => c.class_id))
                }
            }
        });

        for (const date of scheduleDates) {
            const scheduleStartTime = new Date(date);
            scheduleStartTime.setHours(startHour.getHours(), startHour.getMinutes());
            
            const scheduleEndTime = new Date(date);
            scheduleEndTime.setHours(endHour.getHours(), endHour.getMinutes());

            const conflict = existingSchedules.find(schedule => {
                const existingDate = new Date(schedule.days);
                
                if (existingDate.toDateString() !== date.toDateString()) return false;

                const existingStart = new Date(existingDate);
                existingStart.setHours(schedule.start_hour.getHours(), schedule.start_hour.getMinutes());
                
                const existingEnd = new Date(existingDate);
                existingEnd.setHours(schedule.end_hour.getHours(), schedule.end_hour.getMinutes());

                return (scheduleStartTime <= existingEnd && scheduleEndTime >= existingStart);
            });

            if (conflict) {
                throw new HttpException(
                    `Lịch h���c bị trùng vào ngày ${date.toLocaleDateString('vi-VN')}`,
                    HttpStatus.CONFLICT
                );
            }

            // Thêm lịch mới nếu không có xung đột
            const newSchedule = await this.prisma.schedule.create({
                data: {
                    class_id: classId,
                    days: date,
                    start_hour: scheduleStartTime,
                    end_hour: scheduleEndTime,
                },
            });
            createdSchedules.push(newSchedule);
        }

        return createdSchedules;
    }

    // // Thêm method mới để kiểm tra trùng lịch
    // private async checkScheduleConflict(
    //     ptId: number,
    //     startTime: Date,
    //     endTime: Date
    // ): Promise<{ schedule: schedule; className: string } | null> {
    //     try {
    //         // 1. Lấy tất cả các lớp PT đang phụ trách
    //         const ptClasses = await this.prisma.renamedclass.findMany({
    //             where: {
    //                 pt_id: ptId,
    //                 status_id: 1  // Chỉ lấy lớp đang hoạt động
    //             }
    //         });

    //         // 2. Kiểm tra xung đột với tất cả lịch hiện có
    //         const conflictingSchedule = await this.prisma.schedule.findFirst({
    //             where: {
    //                 AND: [
    //                     {
    //                         class_id: {
    //                             in: ptClasses.map(c => c.class_id)  // Lọc theo các lớp của PT
    //                         },
    //                         // Kiểm tra cùng ngày
    //                         days: new Date(
    //                             startTime.getFullYear(),
    //                             startTime.getMonth(),
    //                             startTime.getDate()
    //                         ),
    //                         OR: [
    //                             // TH1: Thời gian bắt đầu mới nằm trong khoảng thời gian cũ
    //                             {
    //                                 AND: [
    //                                     { start_hour: { lte: startTime } },  // Giờ bắt đầu cũ <= Giờ bắt đầu mới
    //                                     { end_hour: { gt: startTime } }      // Giờ kết thúc cũ > Giờ bắt đầu mới
    //                                 ]
    //                             },
    //                             // TH2: Thời gian kết thúc mới nằm trong khoảng thời gian cũ
    //                             {
    //                                 AND: [
    //                                     { start_hour: { lt: endTime } },     // Giờ bắt đầu cũ < Giờ kết thúc mới
    //                                     { end_hour: { gte: endTime } }       // Giờ kết thúc cũ >= Giờ kết thúc mới
    //                                 ]
    //                             },
    //                             // TH3: Khoảng thời gian mới bao trọn khoảng thời gian cũ
    //                             {
    //                                 AND: [
    //                                     { start_hour: { gte: startTime } },  // Giờ bắt đầu cũ >= Giờ bắt đầu mới
    //                                     { end_hour: { lte: endTime } }       // Giờ kết thúc cũ <= Giờ kết thúc mới
    //                                 ]
    //                             }
    //                         ]
    //                     }
    //                 ]
    //             }
    //         });

    //         // 3. Nếu có xung đột, trả về thông tin chi tiết
    //         if (conflictingSchedule) {
    //             const classInfo = ptClasses.find(c => c.class_id === conflictingSchedule.class_id);
    //             return {
    //                 schedule: conflictingSchedule,
    //                 className: classInfo?.class_name || 'Unknown Class'
    //             };
    //         }

    //         return null;  // Không có xung đột
    //     } catch (error) {
    //         console.error('Error checking schedule conflict:', error);
    //         throw new HttpException(
    //             'Lỗi khi kiểm tra trùng lịch',
    //             HttpStatus.INTERNAL_SERVER_ERROR
    //         );
    //     }
    // }
}
