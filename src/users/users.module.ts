import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { PendingRegistrationRepository } from './pending-registration.repository';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UsersService, UsersRepository, PendingRegistrationRepository],
  controllers: [UsersController],
  exports: [UsersService, UsersRepository, PendingRegistrationRepository],
})
export class UsersModule {}
