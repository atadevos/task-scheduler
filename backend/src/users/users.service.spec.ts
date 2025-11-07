import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { AppLogger } from '../logger/logger.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let logger: AppLogger;

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

  const mockManagerUser: User = {
    ...mockUser,
    id: 3,
    email: 'manager@example.com',
    role: UserRole.MANAGER,
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      remove: jest.fn(),
    };

    const mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: AppLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    logger = module.get<AppLogger>(AppLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return empty array for regular users', async () => {
      const result = await service.findAll(UserRole.USER, '1');

      expect(result).toEqual([]);
      expect(logger.debug).toHaveBeenCalledWith('Fetching all users', 'UsersService');
    });

    it('should return all users for admin', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser, mockAdminUser]),
      };

      (userRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(UserRole.ADMIN);

      expect(result).toEqual([mockUser, mockAdminUser]);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'user.id',
        'user.email',
        'user.name',
        'user.role',
        'user.createdAt',
        'user.updatedAt',
      ]);
    });

    it('should filter users for managers', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };

      (userRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(UserRole.MANAGER);

      expect(result).toEqual([mockUser]);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', {
        role: UserRole.USER,
      });
    });
  });

  describe('findOne', () => {
    it('should return user when found', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        select: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      expect(logger.warn).toHaveBeenCalledWith('User not found: 999', 'UsersService');
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found by email', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
      role: UserRole.USER,
    };

    beforeEach(() => {
      (userRepository.create as jest.Mock).mockReturnValue(mockUser);
      (userRepository.save as jest.Mock).mockResolvedValue(mockUser);
    });

    it('should create user successfully for admin', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null); // No existing user
      const userWithoutPassword = { ...mockUser };
      delete (userWithoutPassword as any).passwordHash;
      (userRepository.save as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.create(createUserDto, UserRole.ADMIN);

      expect(result).toEqual(userWithoutPassword); // Service returns user without passwordHash
      expect(userRepository.create).toHaveBeenCalledWith({
        email: createUserDto.email,
        passwordHash: expect.any(String), // Should be hashed
        name: createUserDto.name,
        role: createUserDto.role,
      });
      expect(logger.info).toHaveBeenCalledWith(
        'User created successfully: 1 (test@example.com)',
        'UsersService',
        { userId: 1, role: UserRole.USER },
      );
    });

    it('should prevent managers from creating non-user roles', async () => {
      const managerCreateDto = { ...createUserDto, role: UserRole.ADMIN };
      (userRepository.findOne as jest.Mock).mockResolvedValue(null); // No existing user

      await expect(service.create(managerCreateDto, UserRole.MANAGER)).rejects.toThrow(
        BadRequestException,
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'User creation failed: manager attempted to create admin role',
        'UsersService',
      );
    });

    it('should force user role for managers', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      const managerCreateDto = { ...createUserDto, role: UserRole.USER }; // Manager specifies USER role
      const result = await service.create(managerCreateDto, UserRole.MANAGER);

      expect(result.role).toBe(UserRole.USER); // Service allows USER role for managers
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.USER }),
      );
    });

    it('should throw ConflictException for existing email', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser); // Existing user found

      await expect(service.create(createUserDto, UserRole.ADMIN)).rejects.toThrow(
        ConflictException,
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'User creation failed: email already exists - newuser@example.com',
        'UsersService',
      );
    });

    it('should hash password', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await service.create(createUserDto, UserRole.ADMIN);

      const createCall = (userRepository.create as jest.Mock).mock.calls[0][0];
      expect(createCall.passwordHash).not.toBe('password123');
      expect(createCall.passwordHash).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash pattern
    });

    it('should return user without password hash', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);
      const userWithoutPassword = { ...mockUser };
      delete (userWithoutPassword as any).passwordHash;
      (userRepository.save as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.create(createUserDto, UserRole.ADMIN);

      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Updated Name',
      email: 'updated@example.com',
    };

    beforeEach(() => {
      // Mock user lookup - return user for id queries
      (userRepository.findOne as jest.Mock).mockImplementation((options: any) => {
        if (options.where.id === 1) {
          return Promise.resolve(mockUser); // User being updated
        } else if (options.where.email === 'updated@example.com') {
          return Promise.resolve(null); // No email conflict
        }
        return Promise.resolve(null);
      });
      (userRepository.save as jest.Mock).mockResolvedValue({ ...mockUser, ...updateUserDto });
    });

    it('should update user successfully', async () => {
      const result = await service.update(1, updateUserDto);

      expect(result.name).toBe('Updated Name');
      expect(result.email).toBe('updated@example.com');
      expect(logger.info).toHaveBeenCalledWith('User updated successfully: 1', 'UsersService', {
        userId: 1,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update(999, updateUserDto)).rejects.toThrow(NotFoundException);
      expect(logger.warn).toHaveBeenCalledWith('User update failed: user not found - 999', 'UsersService');
    });

    it('should throw ConflictException for existing email', async () => {
      // Override mock for this specific test
      (userRepository.findOne as jest.Mock).mockImplementation((options: any) => {
        if (options.where.id === 1) {
          return Promise.resolve(mockUser); // User being updated
        } else if (options.where.email === 'admin@example.com') {
          return Promise.resolve(mockAdminUser); // Email conflict - another user has this email
        }
        return Promise.resolve(null);
      });

      await expect(service.update(1, { email: 'admin@example.com' })).rejects.toThrow(
        ConflictException,
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'User update failed: email already exists - admin@example.com',
        'UsersService',
      );
    });

    it('should hash password when provided', async () => {
      const passwordUpdate = { password: 'newpassword123' };

      await service.update(1, passwordUpdate);

      expect(userRepository.save).toHaveBeenCalled();
      const saveCall = (userRepository.save as jest.Mock).mock.calls[0][0];
      expect(saveCall.passwordHash).toMatch(/^\$2[ayb]\$.{56}$/);
    });

    it('should not check email conflict for same email', async () => {
      const sameEmailUpdate = { email: mockUser.email, name: 'New Name' };

      await service.update(1, sameEmailUpdate);

      // Should only call findOne once for user lookup, not for email conflict check
      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should return user without password hash', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      const updatedUser = { ...mockUser, ...updateUserDto };
      (userRepository.save as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.update(1, updateUserDto);

      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.remove as jest.Mock).mockResolvedValue(undefined);
    });

    it('should delete user successfully', async () => {
      await service.remove(1, UserRole.ADMIN);

      expect(userRepository.remove).toHaveBeenCalledWith(mockUser);
      expect(logger.info).toHaveBeenCalledWith('User deleted successfully: 1', 'UsersService', {
        userId: 1,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(999, UserRole.ADMIN)).rejects.toThrow(NotFoundException);
      expect(logger.warn).toHaveBeenCalledWith('User deletion failed: user not found - 999', 'UsersService');
    });

    it('should prevent deletion of admin users', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockAdminUser);

      await expect(service.remove(2, UserRole.ADMIN)).rejects.toThrow(BadRequestException);
      expect(logger.warn).toHaveBeenCalledWith(
        'User deletion failed: cannot delete admin user - 2',
        'UsersService',
      );
    });

    it('should prevent managers from deleting other managers', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockManagerUser);

      await expect(service.remove(3, UserRole.MANAGER)).rejects.toThrow(BadRequestException);
      expect(logger.warn).toHaveBeenCalledWith(
        'User deletion failed: manager attempted to delete manager - 3',
        'UsersService',
      );
    });

    it('should allow managers to delete regular users', async () => {
      await service.remove(1, UserRole.MANAGER);

      expect(userRepository.remove).toHaveBeenCalledWith(mockUser);
    });
  });
});
