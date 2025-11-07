import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Task } from '../entities/task.entity';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 3306),
  username: configService.get<string>('DB_USER', 'taskuser'),
  password: configService.get<string>('DB_PASSWORD', 'taskpass123'),
  database: configService.get<string>('DB_NAME', 'task_scheduler'),
  entities: [User, Task],
  autoLoadEntities: true,
  synchronize: false, // We're using migrations/init.sql
  logging: configService.get<string>('NODE_ENV') === 'development',
  extra: {
    charset: 'utf8mb4',
  },
});

