import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../entities/user.entity';
import { AppLogger } from '../logger/logger.service';

interface InitialUser {
  id?: string; // Optional, kept for backward compatibility but not used (IDs are auto-generated)
  email: string;
  name: string;
  role: string; // JSON contains strings, we'll convert to UserRole enum
  password: string;
}

interface InitialData {
  users: InitialUser[];
}

@Injectable()
export class SetupService implements OnModuleInit {
  private readonly configPath: string;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {
    // Resolve config file path
    const configDir = path.join(process.cwd(), 'config');
    this.configPath = path.join(configDir, 'initial-data.json');
  }

  async onModuleInit() {
    // Always validate admin exists, but only seed if enabled
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const runSetup = this.configService.get<string>('RUN_SETUP', 'true').toLowerCase() === 'true';

    try {
      // Always try to seed initial data if config exists
      if (runSetup || nodeEnv !== 'production') {
        await this.seedInitialData();
      }

      // Always validate admin exists (critical check - app cannot run without admin)
      await this.validateAdminExists();
    } catch (error) {
      this.logger.error('Setup failed', (error as Error).stack, 'SetupService');
      // Always throw - app cannot start without admin user
      throw error;
    }
  }

  private async seedInitialData() {
    this.logger.info('Starting initial data setup', 'SetupService');

    // Statuses are now an enum in the tasks table, no need to seed them

    // Seed users from config (if config file exists)
    if (!fs.existsSync(this.configPath)) {
      this.logger.warn(
        `Initial data config file not found: ${this.configPath}.`,
        'SetupService',
      );
      return;
    }

    const configContent = fs.readFileSync(this.configPath, 'utf-8');
    const initialData: InitialData = JSON.parse(configContent);
    await this.seedUsers(initialData.users);

    this.logger.info('Initial data setup completed', 'SetupService');
  }


  private resolveEnvVariable(value: string): string {
    if (value.startsWith('${') && value.endsWith('}')) {
      const envVar = value.slice(2, -1);
      const parts = envVar.includes(':-') ? envVar.split(':-') : [envVar, ''];
      const varName = parts[0];
      const defaultValue = parts[1] || '';
      return this.configService.get<string>(varName, defaultValue);
    }
    return value;
  }

  private async seedUsers(users: InitialUser[]) {
    for (const userData of users) {
      // Resolve environment variables in all fields
      const email = this.resolveEnvVariable(userData.email);
      const name = this.resolveEnvVariable(userData.name);

      // Check if user exists by email (not by ID since we're using auto-increment)
      const existing = await this.usersRepository.findOne({
        where: { email },
      });

      if (!existing) {
        let password = this.resolveEnvVariable(userData.password);

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Convert string role to UserRole enum
        const role = this.mapStringToUserRole(userData.role);

        const user = this.usersRepository.create({
          email,
          passwordHash,
          name,
          role,
        });

        await this.usersRepository.save(user);
        this.logger.debug(`Created user: ${email} (${userData.role})`, 'SetupService');
      } else {
        // Update password hash if it's the admin user (for password changes)
        if (userData.role === UserRole.ADMIN) {
          let password = this.resolveEnvVariable(userData.password);
          const passwordHash = await bcrypt.hash(password, 10);
          existing.passwordHash = passwordHash;
          await this.usersRepository.save(existing);
          this.logger.debug(`Updated admin password for ${email}`, 'SetupService');
        }
      }
    }
  }

  private mapStringToUserRole(roleString: string): UserRole {
    // Convert string from JSON to UserRole enum
    switch (roleString) {
      case 'admin':
        return UserRole.ADMIN;
      case 'manager':
        return UserRole.MANAGER;
      case 'user':
        return UserRole.USER;
      default:
        this.logger.warn(`Invalid role string in initial data: ${roleString}. Defaulting to USER.`, 'SetupService');
        return UserRole.USER;
    }
  }

  async validateAdminExists(): Promise<void> {
    const adminCount = await this.usersRepository.count({
      where: { role: UserRole.ADMIN },
    });

    if (adminCount === 0) {
      const errorMessage = `
╔════════════════════════════════════════════════════════════════╗
║                    SETUP VALIDATION ERROR                      ║
╠════════════════════════════════════════════════════════════════╣
║  No admin user found in the database!                          ║
║                                                                ║
║  To fix this:                                                  ║
║  1. Add an admin user to backend/config/initial-data.json      ║
║  2. Set ADMIN_PASSWORD environment variable (optional)         ║
║  3. Restart the Docker containers:                             ║
║     docker-compose down                                        ║
║     docker-compose up -d                                       ║
║                                                                ║
║  Example admin user in initial-data.json:                      ║
║  {                                                             ║
║    "email": "\${ADMIN_EMAIL:-admin@example.com}",              ║
║    "name": "\${ADMIN_NAME:-Admin User}",                       ║
║    "role": "admin",                                            ║
║    "password": "\${ADMIN_PASSWORD:-your-secure-password}"      ║
║  }                                                             ║
╚════════════════════════════════════════════════════════════════╝
      `.trim();

      this.logger.error(errorMessage, '', 'SetupService');
      throw new Error('SETUP_ERROR: No admin user found. Please configure an admin user in backend/config/initial-data.json and restart the application.');
    }

    this.logger.info(`Admin validation passed: ${adminCount} admin user(s) found`, 'SetupService');
  }
}

