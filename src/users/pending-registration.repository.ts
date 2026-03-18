import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PendingRegistration } from '@prisma/client';

@Injectable()
export class PendingRegistrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    email: string,
    passwordHash: string,
    name: string | undefined,
    verificationToken: string,
    verificationTokenExpires: Date,
  ): Promise<PendingRegistration> {
    return this.prisma.pendingRegistration.create({
      data: {
        email,
        passwordHash,
        name,
        verificationToken,
        verificationTokenExpires,
      },
    });
  }

  async findByEmail(email: string): Promise<PendingRegistration | null> {
    return this.prisma.pendingRegistration.findUnique({
      where: { email },
    });
  }

  async findByVerificationToken(
    token: string,
  ): Promise<PendingRegistration | null> {
    return this.prisma.pendingRegistration.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpires: {
          gt: new Date(),
        },
      },
    });
  }

  async updateVerificationToken(
    id: string,
    token: string,
    expiresAt: Date,
  ): Promise<PendingRegistration> {
    return this.prisma.pendingRegistration.update({
      where: { id },
      data: {
        verificationToken: token,
        verificationTokenExpires: expiresAt,
      },
    });
  }

  async delete(id: string): Promise<PendingRegistration> {
    return this.prisma.pendingRegistration.delete({
      where: { id },
    });
  }
}
