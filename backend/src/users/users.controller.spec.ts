import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User, UserRole } from '../entities/user.entity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    name: 'Test User',
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
  };

  const mockAdminUser: User = {
    ...mockUser,
    id: 2,
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const mockCurrentUser = {
    userId: 1,
    role: UserRole.ADMIN,
  };

  const mockManagerUser = {
    userId: 2,
    role: UserRole.MANAGER,
  };

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all users for admin', async () => {
      const users = [mockUser, mockAdminUser];
      (service.findAll as jest.Mock).mockResolvedValue(users);

      const result = await controller.findAll(mockCurrentUser);

      expect(result).toEqual(users);
      expect(service.findAll).toHaveBeenCalledWith(UserRole.ADMIN, 1);
    });

    it('should return filtered users for manager', async () => {
      const users = [mockUser];
      (service.findAll as jest.Mock).mockResolvedValue(users);

      const result = await controller.findAll(mockManagerUser);

      expect(result).toEqual(users);
      expect(service.findAll).toHaveBeenCalledWith(UserRole.MANAGER, 2);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      (service.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockUser);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should propagate NotFoundException from service', async () => {
      (service.findOne as jest.Mock).mockRejectedValue(new NotFoundException());

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
      role: UserRole.USER,
    };

    it('should create user successfully', async () => {
      (service.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto, mockCurrentUser);

      expect(result).toEqual(mockUser);
      expect(service.create).toHaveBeenCalledWith(createUserDto, UserRole.ADMIN);
    });

    it('should handle manager creating user', async () => {
      const result = await controller.create(createUserDto, mockManagerUser);

      expect(service.create).toHaveBeenCalledWith(createUserDto, UserRole.MANAGER);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Updated Name',
      email: 'updated@example.com',
    };

    beforeEach(() => {
      (service.findOne as jest.Mock).mockResolvedValue(mockUser);
      (service.update as jest.Mock).mockResolvedValue({ ...mockUser, ...updateUserDto });
    });

    it('should update user successfully for admin', async () => {
      const result = await controller.update(1, updateUserDto, mockCurrentUser);

      expect(result.name).toBe('Updated Name');
      expect(service.update).toHaveBeenCalledWith(1, updateUserDto);
    });

    it('should allow manager to update regular user', async () => {
      const result = await controller.update(1, updateUserDto, mockManagerUser);

      expect(result).toEqual({ ...mockUser, ...updateUserDto });
      expect(service.update).toHaveBeenCalledWith(1, updateUserDto);
    });

    it('should prevent manager from updating admin', async () => {
      (service.findOne as jest.Mock).mockResolvedValue(mockAdminUser);

      await expect(
        controller.update(2, updateUserDto, mockManagerUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent manager from updating other manager', async () => {
      const mockOtherManager = { ...mockUser, role: UserRole.MANAGER };
      (service.findOne as jest.Mock).mockResolvedValue(mockOtherManager);

      await expect(
        controller.update(1, updateUserDto, mockManagerUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate service errors', async () => {
      (service.update as jest.Mock).mockRejectedValue(new NotFoundException());

      await expect(controller.update(999, updateUserDto, mockCurrentUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete user successfully', async () => {
      (service.remove as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.remove(1, mockCurrentUser);

      expect(result).toEqual({ message: 'User deleted successfully' });
      expect(service.remove).toHaveBeenCalledWith(1, UserRole.ADMIN);
    });

    it('should handle manager deleting user', async () => {
      (service.remove as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.remove(1, mockManagerUser);

      expect(service.remove).toHaveBeenCalledWith(1, UserRole.MANAGER);
    });

    it('should propagate service errors', async () => {
      (service.remove as jest.Mock).mockRejectedValue(new NotFoundException());

      await expect(controller.remove(999, mockCurrentUser)).rejects.toThrow(NotFoundException);
    });
  });
});
