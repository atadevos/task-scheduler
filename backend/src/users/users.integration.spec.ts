import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersModule } from './users.module';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';

describe('Users (e2e)', () => {
    let app: INestApplication;
    let userRepository: Repository<User>;
    let jwtService: JwtService;

  // Test users
  let adminUser: User;
  let managerUser: User;
  let regularUser: User;
  let adminToken: string;
  let managerToken: string;

  beforeAll(async () => {
    // Note: Database availability is checked by the test runner script
    // If we reach here, the database should be available

    // Override DB_HOST for tests to connect to localhost
    process.env.DB_HOST = 'localhost';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '../.env',
          // Override DB_HOST for tests to connect to localhost instead of docker service
          load: [
            () => ({
              DB_HOST: process.env.DB_HOST || 'localhost',
              DB_PORT: process.env.DB_PORT || '3306',
              DB_USER: process.env.DB_USER || 'taskuser',
              DB_PASSWORD: process.env.DB_PASSWORD || 'taskpass123',
              DB_NAME: process.env.DB_NAME || 'task_scheduler_test',
            }),
          ],
        }),
        TypeOrmModule.forRoot({
          type: 'mysql',
          host: process.env.DB_HOST || 'localhost', // Use localhost for tests, not docker service name
          port: parseInt(process.env.DB_PORT || '3306'),
          username: process.env.DB_USER || 'taskuser',
          password: process.env.DB_PASSWORD || 'taskpass123',
          database: process.env.DB_NAME || 'task_scheduler_test',
          entities: ['src/**/*.entity{.ts,.js}'],
          synchronize: true,
          dropSchema: false, // Disable dropSchema to avoid foreign key issues
          logging: false,
        }),
        UsersModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Clear existing data to ensure clean test state
    // Clear tables in reverse dependency order to avoid foreign key constraints
    const queryRunner = userRepository.manager.connection.createQueryRunner();
    await queryRunner.manager.query('SET FOREIGN_KEY_CHECKS = 0');
    await queryRunner.manager.query('TRUNCATE TABLE tasks');
    await queryRunner.manager.query('TRUNCATE TABLE users');
    await queryRunner.manager.query('SET FOREIGN_KEY_CHECKS = 1');
    await queryRunner.release();

    // Create test users directly in database
    adminUser = await userRepository.save({
      email: 'admin@test.com',
      passwordHash: '$2a$10$hashedPasswordForAdmin',
      name: 'Admin User',
      role: UserRole.ADMIN,
    });

    managerUser = await userRepository.save({
      email: 'manager@test.com',
      passwordHash: '$2a$10$hashedPasswordForManager',
      name: 'Manager User',
      role: UserRole.MANAGER,
    });

    regularUser = await userRepository.save({
      email: 'user@test.com',
      passwordHash: '$2a$10$hashedPasswordForUser',
      name: 'Regular User',
      role: UserRole.USER,
    });

    // Generate JWT tokens for testing
    adminToken = jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });

    managerToken = jwtService.sign({
      sub: managerUser.id,
      email: managerUser.email,
      role: managerUser.role,
    });
  });

  afterAll(async () => {
    if (userRepository) {
      await userRepository.clear();
    }
    if (app) {
      await app.close();
    }
  });

  describe('GET /users', () => {
    it('should return all users for admin', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(3);
          expect(res.body.some((user: User) => user.email === 'admin@test.com')).toBe(true);
          expect(res.body.some((user: User) => user.email === 'manager@test.com')).toBe(true);
          expect(res.body.some((user: User) => user.email === 'user@test.com')).toBe(true);
        });
    });

    it('should return only regular users for manager', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.some((user: User) => user.role === UserRole.ADMIN)).toBe(false);
          expect(res.body.some((user: User) => user.role === UserRole.MANAGER)).toBe(false);
          expect(res.body.some((user: User) => user.role === UserRole.USER)).toBe(true);
        });
    });

    it('should deny access to regular users', () => {
      const userToken = jwtService.sign({
        sub: regularUser.id,
        email: regularUser.email,
        role: regularUser.role,
      });

      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id for admin', () => {
      return request(app.getHttpServer())
        .get(`/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.id).toBe(regularUser.id);
          expect(res.body.email).toBe(regularUser.email);
          expect(res.body.name).toBe(regularUser.name);
          expect(res.body.role).toBe(regularUser.role);
          expect(res.body).not.toHaveProperty('passwordHash');
        });
    });

    it('should return user by id for manager', () => {
      return request(app.getHttpServer())
        .get(`/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should deny access to regular users', () => {
      const userToken = jwtService.sign({
        sub: regularUser.id,
        email: regularUser.email,
        role: regularUser.role,
      });

      return request(app.getHttpServer())
        .get(`/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('POST /users', () => {
    const newUser: CreateUserDto = {
      email: 'newuser@test.com',
      password: 'password123',
      name: 'New User',
      role: UserRole.USER,
    };

    afterEach(async () => {
      // Clean up created users
      try {
        await userRepository.delete({ email: 'newuser@test.com' });
      } catch (error) {
        // Ignore if user doesn't exist
      }
    });

    it('should create user for admin', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201)
        .expect((res: request.Response) => {
          expect(res.body.email).toBe(newUser.email);
          expect(res.body.name).toBe(newUser.name);
          expect(res.body.role).toBe(newUser.role);
          expect(res.body).not.toHaveProperty('passwordHash');
          expect(res.body).toHaveProperty('id');
        });
    });

    it('should create regular user for manager', () => {
      const managerUserDto = { ...newUser, email: 'managercreated@test.com' };

      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(managerUserDto)
        .expect(201)
        .expect((res: request.Response) => {
          expect(res.body.role).toBe(UserRole.USER); // Should be forced to USER
        })
        .then(async () => {
          // Clean up
          await userRepository.delete({ email: 'managercreated@test.com' });
        });
    });

    it('should prevent manager from creating admin', () => {
      const adminUserDto = { ...newUser, role: UserRole.ADMIN, email: 'adminbyManager@test.com' };

      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(adminUserDto)
        .expect(400);
    });

    it('should prevent duplicate email', () => {
      const duplicateUser = { ...newUser, email: regularUser.email };

      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateUser)
        .expect(409);
    });

    it('should validate required fields', () => {
      const invalidUser = { email: 'test@test.com' }; // Missing required fields

      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUser)
        .expect(400);
    });
  });

  describe('PUT /users/:id', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userRepository.save({
        email: 'updatetest@test.com',
        passwordHash: '$2a$10$testHash',
        name: 'Update Test User',
        role: UserRole.USER,
      });
    });

    afterEach(async () => {
      try {
        await userRepository.delete({ email: 'updatetest@test.com' });
        await userRepository.delete({ email: 'updated@test.com' });
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should update user for admin', () => {
      const updateData: UpdateUserDto = {
        name: 'Updated Name',
        email: 'updated@test.com',
      };

      return request(app.getHttpServer())
        .put(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.name).toBe('Updated Name');
          expect(res.body.email).toBe('updated@test.com');
          expect(res.body).not.toHaveProperty('passwordHash');
        });
    });

    it('should allow manager to update regular user', () => {
      const updateData: UpdateUserDto = {
        name: 'Manager Updated Name',
      };

      return request(app.getHttpServer())
        .put(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData)
        .expect(200);
    });

    it('should prevent manager from updating admin', () => {
      const updateData: UpdateUserDto = {
        name: 'Should Not Update',
      };

      return request(app.getHttpServer())
        .put(`/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should prevent manager from updating other manager', () => {
      const updateData: UpdateUserDto = {
        name: 'Should Not Update',
      };

      return request(app.getHttpServer())
        .put(`/users/${managerUser.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should return 404 for non-existent user', () => {
      const updateData: UpdateUserDto = {
        name: 'Should Not Exist',
      };

      return request(app.getHttpServer())
        .put('/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);
    });
  });

  describe('DELETE /users/:id', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userRepository.save({
        email: 'deletetest@test.com',
        passwordHash: '$2a$10$testHash',
        name: 'Delete Test User',
        role: UserRole.USER,
      });
    });

    it('should delete user for admin', () => {
      return request(app.getHttpServer())
        .delete(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.message).toBe('User deleted successfully');
        });
    });

    it('should allow manager to delete regular user', () => {
      return request(app.getHttpServer())
        .delete(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);
    });

    it('should prevent deletion of admin user', () => {
      return request(app.getHttpServer())
        .delete(`/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should prevent manager from deleting other manager', () => {
      return request(app.getHttpServer())
        .delete(`/users/${managerUser.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(400);
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .delete('/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
