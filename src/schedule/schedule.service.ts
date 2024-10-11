/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { schedule } from '@prisma/client';


@Injectable()
export class ScheduleService {
    constructor(private prisma: DatabaseService){}

    
     //thêm lịch
    async addSchedule(
        class_id: number,
        days: string, 
        start_hour: Date, 
        end_hour: Date,     
    ){
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
            throw error;
          }
    }

    //Sửa lịch
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
            throw error;
          }
    }

    //Xóa lịch
    async deleteSchedule(schedule_id: number): Promise<schedule>{
        return this.prisma.schedule.delete({
            where: {schedule_id}
        });
    }

    // Lấy lịch (theo ID)
    async getSchedule(class_id?: number, schedule_id?: number): Promise<schedule> {
        if (class_id) {
        return this.prisma.$queryRaw`
            CALL GetClassAndScheduleByClassOrScheduleID(${class_id}, NULL);
        `;
        } else if (schedule_id) {
        return this.prisma.$queryRaw`
            CALL GetClassAndScheduleByClassOrScheduleID(NULL, ${schedule_id});
        `;
        } else {
        throw new Error('Must provide either class_id or schedule_id');
        }
    }

    //lấy tất cả các lịch dựa trên class id
    async getAllScheduleByClassID(class_id?: number): Promise<schedule[]> {
        try {
            const schedules = await this.prisma.schedule.findMany({
                where: {
                    class_id: class_id,  // filter class_id
                },
            });
            return schedules;
        } catch (error) {
            console.error('Error fetching schedules:', error);
            throw new Error('Unable to fetch schedules.');
        }
    }
}
