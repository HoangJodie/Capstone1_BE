import { IsEmail, IsNotEmpty, IsString, IsOptional, Length } from 'class-validator';

export class UserDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 64)
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phoneNum?: string;

  // Không yêu cầu role_id và status_id ở đây
}
