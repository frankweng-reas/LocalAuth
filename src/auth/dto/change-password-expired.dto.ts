import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { IsPasswordPolicy } from '../utils/password-validator';

/** 密碼過期時強制更換密碼（不需 JWT） */
export class ChangePasswordExpiredDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  old_password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: '密碼長度至少 8 碼' })
  @IsPasswordPolicy()
  new_password: string;
}
