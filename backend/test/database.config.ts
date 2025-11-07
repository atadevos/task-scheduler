import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const testDatabaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'mysql',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'taskuser',
  password: process.env.DB_PASSWORD || 'taskpass123',
  database: process.env.DB_NAME || 'task_scheduler_test',
  entities: ['src/**/*.entity{.ts,.js}'],
  synchronize: true, // Use synchronize for tests
  dropSchema: true, // Drop schema between tests
  logging: false,
};
