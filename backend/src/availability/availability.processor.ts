import { Processor, Process } from '@nestjs/bull';
import { Inject } from '@nestjs/common';
import { Job } from 'bull';
import { AvailabilityService } from './availability.service';
import { AppLogger } from '../logger/logger.service';

@Processor('availability')
export class AvailabilityProcessor {
  constructor(
    private availabilityService: AvailabilityService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  @Process('update-availability')
  async handleUpdateAvailability(job: Job<{ userId: number }>) {
    const { userId } = job.data;
    this.logger.debug(`Processing availability update for user ${userId}`, 'AvailabilityProcessor');

    try {
      // In a real scenario, you might update a separate availability table
      // For now, we just log it. The overlap check is done synchronously
      // when creating/updating tasks, so this is mainly for notification purposes
      const tasks = await this.availabilityService.getUserTasks(userId);
      this.logger.info(
        `User ${userId} has ${tasks.length} assigned task(s)`,
        'AvailabilityProcessor',
        { userId, taskCount: tasks.length },
      );

      // Here you could:
      // 1. Update an availability cache
      // 2. Send notifications
      // 3. Update a separate availability tracking table

      return { success: true, taskCount: tasks.length };
    } catch (error) {
      this.logger.error(
        `Error processing availability update for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
        'AvailabilityProcessor',
      );
      throw error;
    }
  }
}

