import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskRepositoryService } from './task-repository.service';
import { Task } from '../entities/task.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, User])],
  providers: [TaskRepositoryService],
  exports: [TaskRepositoryService],
})
export class TaskRepositoryModule {}
