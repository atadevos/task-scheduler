import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetupService } from './setup.service';
import { User } from '../entities/user.entity';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    LoggerModule,
  ],
  providers: [SetupService],
  exports: [SetupService],
})
export class SetupModule {}

