import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UsersRepository } from '../users/users.repository';
import { UsersService } from '../users/users.service';

@Controller('admin')
@UseGuards(AdminApiKeyGuard)
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersRepository: UsersRepository,
  ) {}

  @Get('users')
  async listUsers() {
    return this.usersService.findAll();
  }

  @Post('users')
  async createUser(@Body() dto: CreateAdminUserDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create(dto.email, passwordHash, dto.name, true);

    if (dto.mustChangePassword) {
      await this.usersRepository.setPasswordChangedAt(user.id, null);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      mustChangePassword: dto.mustChangePassword ?? false,
    };
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersService.remove(id);
  }
}
