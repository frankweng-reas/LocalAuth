import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * 密碼政策驗證
 * - 最小長度 8 碼
 * - 至少包含 4 種字元類型中的 3 種：大寫、小寫、數字、特殊符號
 */

const MIN_LENGTH = 8;

const PATTERNS = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  digit: /[0-9]/,
  special: /[!$#%@^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/,
};

export const PASSWORD_POLICY_MESSAGE =
  '密碼需至少 8 碼，且包含下列 4 種字元中的 3 種：英文大寫、英文小寫、數字、特殊符號 (!$#% 等)';

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (typeof password !== 'string') {
    return { valid: false, message: PASSWORD_POLICY_MESSAGE };
  }

  if (password.length < MIN_LENGTH) {
    return {
      valid: false,
      message: `密碼長度至少 ${MIN_LENGTH} 碼`,
    };
  }

  const typeCount = [
    PATTERNS.uppercase.test(password),
    PATTERNS.lowercase.test(password),
    PATTERNS.digit.test(password),
    PATTERNS.special.test(password),
  ].filter(Boolean).length;

  if (typeCount < 3) {
    return {
      valid: false,
      message: PASSWORD_POLICY_MESSAGE,
    };
  }

  return { valid: true };
}

/** class-validator 裝飾器：密碼政策 */
export function IsPasswordPolicy(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPasswordPolicy',
      target: object.constructor,
      propertyName,
      options: validationOptions ?? { message: PASSWORD_POLICY_MESSAGE },
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const result = validatePassword(String(value ?? ''));
          return result.valid;
        },
      },
    });
  };
}
