import { IsEmail, IsNotEmpty, IsString, IsOptional, Length } from 'class-validator';

export class UserDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 64) // Đặt giới hạn độ dài cho username
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsEmail() // Kiểm tra định dạng email
  email: string;

  @IsOptional()
  @IsString()
  phoneNum?: string;

  @IsOptional()
  role_id?: number;

  @IsOptional()
  status_id?: number;
}
