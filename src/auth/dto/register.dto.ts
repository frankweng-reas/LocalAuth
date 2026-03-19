import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { IsPasswordPolicy } from '../utils/password-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: '密碼長度至少 8 碼' })
  @IsPasswordPolicy()
  password: string;

  @IsString()
  @IsOptional()
  name?: string;
}
