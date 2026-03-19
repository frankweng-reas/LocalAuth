import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { IsPasswordPolicy } from '../utils/password-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: '密碼長度至少 8 碼' })
  @IsPasswordPolicy()
  new_password: string;
}
