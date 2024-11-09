import { IsString, IsDate, IsNotEmpty } from 'class-validator';

export class UpdateScheduleDto {
    @IsNotEmpty()
    @IsString()
    dayOfWeek: string;

    @IsNotEmpty()
    @IsString()
    startHour: string;

    @IsNotEmpty()
    @IsString()
    endHour: string;

    @IsNotEmpty()
    @IsString()
    days: string;
} 