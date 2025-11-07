import { Injectable } from '@nestjs/common';
import { Task } from '../entities/task.entity';
import { TaskRepositoryService } from '../tasks/task-repository.service';

@Injectable()
export class AvailabilityService {
  constructor(
    private taskRepository: TaskRepositoryService,
  ) {}

  /**
   * Check if a user has overlapping tasks during the given date range
   * Two tasks overlap if they share any time period, including:
   * - Same-day start/end dates
   * - Partial overlaps
   * - Boundary overlaps (one task ends exactly when another starts)
   *
   * Overlap condition: Task A starts <= Task B ends AND Task A ends >= Task B starts
   *
   * Note: Completed tasks are excluded from overlap checking
   */
  async checkOverlap(
    userId: number,
    startDate: Date,
    endDate: Date,
    excludeTaskId: number | null = null,
  ): Promise<boolean> {
    return this.taskRepository.hasOverlappingTasks(userId, startDate, endDate, excludeTaskId);
  }

  /**
   * Get all tasks for a user (for availability tracking)
   */
  async getUserTasks(userId: number): Promise<Task[]> {
    return this.taskRepository.getUserTasksForAvailability(userId);
  }
}

