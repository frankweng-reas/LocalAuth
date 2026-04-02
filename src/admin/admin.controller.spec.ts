import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import { UsersRepository } from '../users/users.repository';
import { UsersService } from '../users/users.service';

const mockUser = {
  id: 'uuid-1',
  email: 'user@example.com',
  name: 'Test User',
  isActive: true,
  emailVerified: true,
  createdAt: new Date(),
};

describe('AdminController', () => {
  let controller: AdminController;
  let usersService: jest.Mocked<UsersService>;
  let usersRepository: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: UsersRepository,
          useValue: {
            setPasswordChangedAt: jest.fn(),
          },
        },
        {
          provide: AdminApiKeyGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
      ],
    })
      .overrideGuard(AdminApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
    usersService = module.get(UsersService);
    usersRepository = module.get(UsersRepository);
  });

  describe('listUsers', () => {
    it('returns all users', async () => {
      usersService.findAll.mockResolvedValue([mockUser]);
      const result = await controller.listUsers();
      expect(result).toEqual([mockUser]);
      expect(usersService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('createUser', () => {
    it('creates a user successfully', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);

      const result = await controller.createUser({
        email: 'user@example.com',
        password: 'Passw0rd!',
        name: 'Test User',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String), // bcrypt hash
        'Test User',
        true,
      );
      expect(result.email).toBe('user@example.com');
      expect(result.mustChangePassword).toBe(false);
    });

    it('sets passwordChangedAt=null when mustChangePassword=true', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);
      usersRepository.setPasswordChangedAt.mockResolvedValue(mockUser as any);

      await controller.createUser({
        email: 'user@example.com',
        password: 'Passw0rd!',
        mustChangePassword: true,
      });

      expect(usersRepository.setPasswordChangedAt).toHaveBeenCalledWith(
        mockUser.id,
        null,
      );
    });

    it('does NOT call setPasswordChangedAt when mustChangePassword is false', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);

      await controller.createUser({
        email: 'user@example.com',
        password: 'Passw0rd!',
        mustChangePassword: false,
      });

      expect(usersRepository.setPasswordChangedAt).not.toHaveBeenCalled();
    });

    it('throws ConflictException when email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        controller.createUser({
          email: 'user@example.com',
          password: 'Passw0rd!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteUser', () => {
    it('deletes an existing user', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      usersService.remove.mockResolvedValue(undefined);

      await controller.deleteUser(mockUser.id);

      expect(usersService.remove).toHaveBeenCalledWith(mockUser.id);
    });

    it('throws NotFoundException when user does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(controller.deleteUser('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
