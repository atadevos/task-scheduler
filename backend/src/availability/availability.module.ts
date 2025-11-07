import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AvailabilityService } from './availability.service';
import { AvailabilityProcessor } from './availability.processor';
import { TaskRepositoryModule } from '../tasks/task-repository.module';

@Module({
  imports: [
    TaskRepositoryModule,
    BullModule.registerQueue({
      name: 'availability',
    }),
  ],
  providers: [AvailabilityService, AvailabilityProcessor],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}

