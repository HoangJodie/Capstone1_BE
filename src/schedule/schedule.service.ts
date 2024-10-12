import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { schedule } from '@prisma/client';

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
    async editSchedule(
        schedule_id: number,
        class_id: number,
        days: string,
        start_hour: Date,
        end_hour: Date,
    ) {
        try {
            const schedule = await this.prisma.schedule.update({
                where: { schedule_id: schedule_id },
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
            throw new Error('Unable to edit schedule.'); // Ném ra lỗi cụ thể
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
}
