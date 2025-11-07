import { Task, TaskStatus } from '../../entities/task.entity';
import { UserRole } from '../../entities/user.entity';
import { CreateTaskDto } from '../../dto/create-task.dto';
import { UpdateTaskDto } from '../../dto/update-task.dto';
import {
  TaskNotFoundException,
  TaskValidationException,
  TaskPermissionException,
} from '../task-exceptions';

/**
 * Pure domain logic for task validation - no external dependencies
 * Easy to unit test with simple inputs and outputs
 */
export class TaskValidationDomain {
  /**
   * Validates task creation data
   * Pure function - no side effects, easy to test
   */
  static validateTaskCreationData(createTaskDto: CreateTaskDto): void {
    this.validateRequiredFields(createTaskDto);
    this.validateDateRange(createTaskDto.startDate, createTaskDto.endDate);
  }

  /**
   * Validates task update permissions and data
   * Pure function - deterministic based on inputs
   */
  static validateTaskUpdatePermissions(
    task: Task,
    updateRequest: UpdateTaskDto,
    userRole?: string,
    currentUserId?: number,
  ): void {
    // Regular users can only update their own tasks
    if (userRole === UserRole.USER && task.assignedUserId !== currentUserId) {
      throw new TaskPermissionException('You can only update your own tasks');
    }

    // Regular users can only update status field
    if (userRole === UserRole.USER) {
      this.validateUserCanOnlyUpdateStatus(updateRequest);
    }
  }

  /**
   * Validates if a task reassignment is allowed
   * Pure function - no external dependencies
   */
  static validateTaskReassignmentData(
    reassignmentRequest: { assignedUserId: number },
  ): void {
    if (!reassignmentRequest.assignedUserId) {
      throw new TaskValidationException('Assigned user ID is required for reassignment');
    }
  }

  /**
   * Validates date range logic
   * Pure function - mathematical validation
   */
  static validateDateRange(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new TaskValidationException('Start date must be before end date');
    }

    if (start < new Date()) {
      throw new TaskValidationException('Start date cannot be in the past');
    }
  }

  /**
   * Validates that required fields are present
   * Pure function - simple object validation
   */
  private static validateRequiredFields(createTaskDto: CreateTaskDto): void {
    if (!createTaskDto.title?.trim()) {
      throw new TaskValidationException('Task title is required');
    }

    if (!createTaskDto.startDate) {
      throw new TaskValidationException('Start date is required');
    }

    if (!createTaskDto.endDate) {
      throw new TaskValidationException('End date is required');
    }

    if (!createTaskDto.assignedUserId) {
      throw new TaskValidationException('Assigned user is required');
    }
  }

  /**
   * Validates that regular users can only update status
   * Pure function - field validation
   */
  private static validateUserCanOnlyUpdateStatus(updateRequest: UpdateTaskDto): void {
    const allowedFields = ['status'];
    const requestedFields = Object.keys(updateRequest);

    const restrictedFields = requestedFields.filter(
      (field) => !allowedFields.includes(field),
    );

    if (restrictedFields.length > 0) {
      throw new TaskPermissionException(
        `Regular users can only update: ${allowedFields.join(', ')}. ` +
        `Attempted to update: ${restrictedFields.join(', ')}`,
      );
    }
  }
}
