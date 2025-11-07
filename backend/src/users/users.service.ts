import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { AppLogger } from '../logger/logger.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async findAll(currentUserRole?: string, currentUserId?: string): Promise<User[]> {
    this.logger.debug('Fetching all users', 'UsersService');

    // Ordinary users cannot see other users
    if (currentUserRole === UserRole.USER) {
      return [];
    }

    const query = this.usersRepository.createQueryBuilder('user')
      .select(['user.id', 'user.email', 'user.name', 'user.role', 'user.createdAt', 'user.updatedAt'])
      .orderBy('user.createdAt', 'DESC');

    // Managers can only see users (not admins or other managers)
    if (currentUserRole === UserRole.MANAGER) {
      query.andWhere('user.role = :role', { role: UserRole.USER });
    }

    return query.getMany();
  }

  async findOne(id: number): Promise<User> {
    this.logger.debug(`Fetching user: ${id}`, 'UsersService');
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      this.logger.warn(`User not found: ${id}`, 'UsersService');
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async create(createUserDto: CreateUserDto, currentUserRole?: string): Promise<User> {
    this.logger.info(`Creating user: ${createUserDto.email}`, 'UsersService');

    // Managers can only create 'user' role
    if (currentUserRole === UserRole.MANAGER && createUserDto.role && createUserDto.role !== UserRole.USER) {
      this.logger.warn(
        `User creation failed: manager attempted to create ${createUserDto.role} role`,
        'UsersService',
      );
      throw new BadRequestException('Managers can only create ordinary users');
    }

    // Check if user with email already exists
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      this.logger.warn(
        `User creation failed: email already exists - ${createUserDto.email}`,
        'UsersService',
      );
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    // Create user - managers can only create 'user' role
    const role = currentUserRole === UserRole.MANAGER ? UserRole.USER : (createUserDto.role || UserRole.USER);

    const user = this.usersRepository.create({
      email: createUserDto.email,
      passwordHash,
      name: createUserDto.name,
      role,
    });

    const savedUser = await this.usersRepository.save(user);

    this.logger.info(
      `User created successfully: ${savedUser.id} (${savedUser.email})`,
      'UsersService',
      { userId: savedUser.id, role: savedUser.role },
    );

    // Return user without password hash
    const { passwordHash: _, ...result } = savedUser;
    return result as User;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    this.logger.info(`Updating user: ${id}`, 'UsersService');

    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      this.logger.warn(`User update failed: user not found - ${id}`, 'UsersService');
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if email is being updated and if it's already taken
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        this.logger.warn(
          `User update failed: email already exists - ${updateUserDto.email}`,
          'UsersService',
        );
        throw new ConflictException('User with this email already exists');
      }
    }

    // Hash password if provided
    let passwordHash: string | undefined;
    if (updateUserDto.password) {
      passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Update user fields
    Object.assign(user, {
      ...(updateUserDto.email && { email: updateUserDto.email }),
      ...(passwordHash && { passwordHash }),
      ...(updateUserDto.name && { name: updateUserDto.name }),
      ...(updateUserDto.role && { role: updateUserDto.role }),
    });

    const updatedUser = await this.usersRepository.save(user);

    this.logger.info(
      `User updated successfully: ${updatedUser.id}`,
      'UsersService',
      { userId: updatedUser.id },
    );

    // Return user without password hash
    const { passwordHash: _, ...result } = updatedUser;
    return result as User;
  }

  async remove(id: number, currentUserRole?: string): Promise<void> {
    this.logger.info(`Deleting user: ${id}`, 'UsersService');

    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      this.logger.warn(`User deletion failed: user not found - ${id}`, 'UsersService');
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Prevent deletion of admin users
    if (user.role === UserRole.ADMIN) {
      this.logger.warn(
        `User deletion failed: cannot delete admin user - ${id}`,
        'UsersService',
      );
      throw new BadRequestException('Cannot delete admin users');
    }

    // Managers cannot delete other managers
    if (currentUserRole === UserRole.MANAGER && user.role === UserRole.MANAGER) {
      this.logger.warn(
        `User deletion failed: manager attempted to delete manager - ${id}`,
        'UsersService',
      );
      throw new BadRequestException('Managers can only delete ordinary users');
    }

    await this.usersRepository.remove(user);

    this.logger.info(`User deleted successfully: ${id}`, 'UsersService', {
      userId: id,
    });
  }
}

