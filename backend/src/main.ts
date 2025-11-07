import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from '@/app.module';
import { AppLogger } from './logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Get logger and config service
  const logger = app.get(AppLogger);
  const configService = app.get(ConfigService);

  // Set Winston as the logger
  app.useLogger(logger);

  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow the configured origin
      if (origin === corsOrigin) {
        return callback(null, true);
      }

      // In development, allow localhost origins
      if (nodeEnv !== 'production' && origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }

      logger.warn(`CORS blocked request from origin: ${origin}`, 'CORS');
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Register global exception filter
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        // Log validation errors before throwing
        const messages = errors.map((err) => {
          const constraints = err.constraints ? Object.values(err.constraints) : [];
          return constraints.join(', ');
        });
        logger.warn(
          `Validation failed: ${messages.join('; ')}`,
          'ValidationPipe',
          { errors },
        );
        return new BadRequestException(messages);
      },
    }),
  );

  app.setGlobalPrefix('api');

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`🚀 Backend running on http://localhost:${port}`, 'Bootstrap');
  logger.log(`✅ CORS enabled for origin: ${corsOrigin}`, 'Bootstrap');
  logger.log(`📝 Environment: ${nodeEnv}`, 'Bootstrap');
  logger.log(`📊 Log level: ${configService.get<string>('LOG_LEVEL', 'info')}`, 'Bootstrap');
}
bootstrap();