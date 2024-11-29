import { IsNotEmpty, IsString } from 'class-validator';

export class ChatRequestDto {
  @IsNotEmpty()
  @IsString()
  message: string;
} 