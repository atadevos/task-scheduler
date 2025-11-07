import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskRepositoryModule } from './task-repository.module';
import { TaskBusinessLogicService } from './task-business-logic.service';
import { TaskDomainService } from './services/task-domain.service';
import { ITaskRepository } from './interfaces/task-repository.interface';
import { IAvailabilityService } from './interfaces/availability.interface';
import { TaskRepositoryService } from './task-repository.service';
import { TaskNotificationService } from './task-notification.service';
import { AvailabilityService } from '../availability/availability.service';
import { AvailabilityModule } from '../availability/availability.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TaskRepositoryModule,
    BullModule.registerQueue({
      name: 'availability',
    }),
    AvailabilityModule,
    NotificationsModule,
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskBusinessLogicService,
    TaskDomainService,
    TaskNotificationService,
    // Provide interface-to-implementation mappings using string tokens
    // TaskRepositoryService is provided by TaskRepositoryModule
    {
      provide: 'ITaskRepository',
      useExisting: TaskRepositoryService,
    },
    {
      provide: 'IAvailabilityService',
      useClass: AvailabilityService,
    },
  ],
})
export class TasksModule {}

