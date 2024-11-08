import { IsString, IsDate, IsInt, Min, Max, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScheduleDto {
    @IsNotEmpty()
    @IsInt()
    @Min(0)
    @Max(6)
    dayOfWeek: number; // 0 = Thứ 2, 1 = Thứ 3, ..., 6 = Chủ nhật

    @IsNotEmpty()
    @Type(() => Date)
    @IsDate()
    startHour: Date;

    @IsNotEmpty()
    @Type(() => Date)
    @IsDate()
    endHour: Date;
} 