import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const adminApiKey = this.configService.get<string>('ADMIN_API_KEY');

    if (!adminApiKey) {
      throw new UnauthorizedException('Admin API is not configured');
    }

    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers['x-admin-api-key'];

    if (!providedKey || providedKey !== adminApiKey) {
      throw new UnauthorizedException('Invalid or missing admin API key');
    }

    return true;
  }
}
