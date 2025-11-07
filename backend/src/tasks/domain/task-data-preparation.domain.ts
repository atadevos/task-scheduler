import { Task, TaskStatus } from '../../entities/task.entity';
import { CreateTaskDto } from '../../dto/create-task.dto';
import { UpdateTaskDto } from '../../dto/update-task.dto';

/**
 * Pure domain logic for task data preparation and transformation
 * No external dependencies - easy to unit test
 */
export class TaskDataPreparationDomain {
  /**
   * Prepares task data for creation
   * Pure function - transforms input DTO to entity data
   */
  static prepareTaskForCreation(
    createRequest: CreateTaskDto,
    creatorUserId?: number,
  ): Partial<Task> {
    return {
      title: createRequest.title.trim(),
      description: createRequest.description?.trim(),
      status: createRequest.status || TaskStatus.IN_PROGRESS,
      startDate: new Date(createRequest.startDate),
      endDate: new Date(createRequest.endDate),
      assignedUserId: createRequest.assignedUserId,
      assignedById: creatorUserId,
    };
  }

  /**
   * Prepares task data for update
   * Pure function - handles the complex foreign key update logic
   */
  static prepareTaskForUpdate(
    existingTask: Task,
    updateRequest: UpdateTaskDto,
    requestingUserId?: number,
  ): Partial<Task> {
    const updates: Partial<Task> = {};

    // Apply basic field updates
    if (updateRequest.title !== undefined) {
      updates.title = updateRequest.title.trim();
    }

    if (updateRequest.description !== undefined) {
      updates.description = updateRequest.description?.trim();
    }

    if (updateRequest.status !== undefined) {
      updates.status = updateRequest.status;
    }

    // Handle date conversions
    if (updateRequest.startDate) {
      updates.startDate = new Date(updateRequest.startDate);
    }

    if (updateRequest.endDate) {
      updates.endDate = new Date(updateRequest.endDate);
    }

    return updates;
  }

  /**
   * Handles the special case of task reassignment
   * Pure function - modifies task entity directly for foreign key updates
   */
  static applyTaskReassignment(
    targetTask: Task,
    reassignmentRequest: { assignedUserId: number },
    requestingUserId?: number,
  ): void {
    // Clear existing relation to force TypeORM foreign key update
    targetTask.assignedUser = undefined as any;
    targetTask.assignedUserId = reassignmentRequest.assignedUserId;
    targetTask.assignedById = requestingUserId;
  }

  /**
   * Determines if an update requires overlap validation
   * Pure function - logical decision based on update fields
   */
  static requiresOverlapValidation(updateRequest: UpdateTaskDto): boolean {
    return !!(
      updateRequest.assignedUserId ||
      updateRequest.startDate ||
      updateRequest.endDate
    );
  }

  /**
   * Calculates effective date range for validation
   * Pure function - combines existing and requested dates
   */
  static calculateEffectiveDateRange(
    existingTask: Task,
    updateRequest: UpdateTaskDto,
  ): { startDate: Date; endDate: Date } {
    const effectiveStartDate = updateRequest.startDate
      ? new Date(updateRequest.startDate)
      : existingTask.startDate;

    const effectiveEndDate = updateRequest.endDate
      ? new Date(updateRequest.endDate)
      : existingTask.endDate;

    return {
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
    };
  }
}
