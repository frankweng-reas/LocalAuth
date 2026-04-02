import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { IsPasswordPolicy } from '../../auth/utils/password-validator';

export class CreateAdminUserDto {
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

  /**
   * 若設為 true，用戶首次登入時將被強制要求更換密碼。
   * 實作方式：建立 User 後將 passwordChangedAt 設為 null，
   * login() 的 90 天到期判斷會視為「已過期」並強制改密。
   */
  @IsBoolean()
  @IsOptional()
  mustChangePassword?: boolean;
}
