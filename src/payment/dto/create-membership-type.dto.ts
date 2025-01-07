import { IsNotEmpty, IsNumber, IsString, IsArray, Min } from 'class-validator';

export class CreateMembershipTypeDto {
    @IsNotEmpty()
    @IsNumber()
    membership_type: number;

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsArray()
    @IsString({ each: true })
    description: string[];

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    price: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    duration: number; // Số tháng
} 