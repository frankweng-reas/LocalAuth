import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(
    email: string,
    passwordHash: string,
    name?: string,
  ): Promise<UserResponse> {
    const user = await this.usersRepository.create(email, passwordHash, name);
    return this.excludePassword(user);
  }

  async findByEmail(email: string): Promise<UserResponse | null> {
    const user = await this.usersRepository.findByEmail(email);
    return user ? this.excludePassword(user) : null;
  }

  async findById(id: string): Promise<UserResponse | null> {
    const user = await this.usersRepository.findById(id);
    return user ? this.excludePassword(user) : null;
  }

  async findByEmailWithPassword(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async findAll(): Promise<UserResponse[]> {
    const users = await this.usersRepository.findAll();
    return users.map((user) => this.excludePassword(user));
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async updateProfile(id: string, data: { name?: string }): Promise<UserResponse> {
    const user = await this.usersRepository.updateProfile(id, data);
    return this.excludePassword(user);
  }

  async deleteAccount(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  private excludePassword(user: any): UserResponse {
    const { 
      passwordHash, 
      refreshToken, 
      verificationToken, 
      verificationTokenExpires,
      ...userWithoutSensitiveData 
    } = user;
    return userWithoutSensitiveData;
  }
}
