import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ConfigModule, UsersModule],
  controllers: [AdminController],
  providers: [AdminApiKeyGuard],
})
export class AdminModule {}
