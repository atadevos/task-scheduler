import { Injectable } from '@nestjs/common';
import { Task, TaskStatus } from '../../entities/task.entity';
import { UserRole } from '../../entities/user.entity';
import { CreateTaskDto } from '../../dto/create-task.dto';
import { UpdateTaskDto } from '../../dto/update-task.dto';
import { ReassignTaskDto } from '../../dto/reassign-task.dto';
import { Inject } from '@nestjs/common';
import { TaskValidationDomain } from '../domain/task-validation.domain';
import { TaskDataPreparationDomain } from '../domain/task-data-preparation.domain';
import { TaskRepositoryService } from '../task-repository.service';
import { AvailabilityService } from '../../availability/availability.service';
import { TaskFilter } from '../interfaces/task-repository.interface';
import { TaskNotFoundException, TaskValidationException } from '../task-exceptions';

/**
 * Domain service that orchestrates pure business logic
 * Dependencies are injected via interfaces for better testability
 */
@Injectable()
export class TaskDomainService {
  constructor(
    @Inject('ITaskRepository')
    private taskRepository: TaskRepositoryService,
    @Inject('IAvailabilityService')
    private availabilityService: AvailabilityService,
  ) {}

  /**
   * Validates and prepares data for task creation
   * Separates validation from external service calls for better testing
   */
  async prepareTaskCreation(createTaskDto: CreateTaskDto): Promise<{
    taskData: Partial<Task>;
    requiresOverlapCheck: boolean;
  }> {
    // Pure validation - no dependencies
    TaskValidationDomain.validateTaskCreationData(createTaskDto);

    // Check for overlapping tasks - external dependency
    const hasOverlap = await this.availabilityService.checkOverlap(
      createTaskDto.assignedUserId,
      new Date(createTaskDto.startDate),
      new Date(createTaskDto.endDate),
      null,
    );

    if (hasOverlap) {
      throw new TaskValidationException(
        'User already has an overlapping task during this time period',
      );
    }

    // Pure data preparation
    const taskData = TaskDataPreparationDomain.prepareTaskForCreation(createTaskDto);

    return {
      taskData,
      requiresOverlapCheck: false, // Already checked above
    };
  }

  /**
   * Validates and prepares data for task update
   */
  async prepareTaskUpdate(
    taskId: number,
    updateTaskDto: UpdateTaskDto,
    currentUserRole?: string,
    currentUserId?: number,
  ): Promise<{
    task: Task;
    updates: Partial<Task>;
    requiresOverlapCheck: boolean;
  }> {
    const task = await this.taskRepository.findOne(taskId);
    if (!task) {
      throw new TaskNotFoundException(taskId);
    }

    // Pure permission validation
    TaskValidationDomain.validateTaskUpdatePermissions(task, updateTaskDto, currentUserRole, currentUserId);

    // Check if overlap validation is needed
    const requiresOverlapCheck = TaskDataPreparationDomain.requiresOverlapValidation(updateTaskDto);

    // If overlap check is needed, validate against external service
    if (requiresOverlapCheck) {
      const { startDate, endDate } = TaskDataPreparationDomain.calculateEffectiveDateRange(
        task,
        updateTaskDto,
      );

      const hasOverlap = await this.availabilityService.checkOverlap(
        updateTaskDto.assignedUserId || task.assignedUserId!,
        startDate,
        endDate,
        taskId,
      );

      if (hasOverlap) {
        throw new TaskValidationException(
          'User already has an overlapping task during this time period',
        );
      }
    }

    // Pure data preparation
    const updates = TaskDataPreparationDomain.prepareTaskForUpdate(task, updateTaskDto);

    return {
      task,
      updates,
      requiresOverlapCheck,
    };
  }

  /**
   * Validates and prepares data for task reassignment
   */
  async prepareTaskReassignment(
    taskId: number,
    reassignTaskDto: ReassignTaskDto,
  ): Promise<{
    task: Task;
    requiresOverlapCheck: boolean;
  }> {
    const task = await this.taskRepository.findOne(taskId);
    if (!task) {
      throw new TaskNotFoundException(taskId);
    }

    // Pure validation
    TaskValidationDomain.validateTaskReassignmentData(reassignTaskDto);

    // Check for overlapping tasks - external dependency
    const hasOverlap = await this.availabilityService.checkOverlap(
      reassignTaskDto.assignedUserId,
      task.startDate,
      task.endDate,
      taskId,
    );

    if (hasOverlap) {
      throw new TaskValidationException(
        'User already has an overlapping task during this time period',
      );
    }

    // Apply reassignment to task entity
    TaskDataPreparationDomain.applyTaskReassignment(task, reassignTaskDto);

    return {
      task,
      requiresOverlapCheck: false, // Already checked
    };
  }

  /**
   * Finds tasks with complex filtering
   * Delegates to repository but provides clean interface
   */
  async findTasks(filter: TaskFilter): Promise<Task[]> {
    return this.taskRepository.findTasksWithComplexFilter(filter);
  }

  /**
   * Gets a task by ID
   */
  async getTaskById(id: number): Promise<Task | null> {
    return this.taskRepository.findOne(id);
  }

  /**
   * Validates task deletion permissions
   */
  async validateTaskDeletion(taskId: number): Promise<Task> {
    const task = await this.taskRepository.findOne(taskId);
    if (!task) {
      throw new TaskNotFoundException(taskId);
    }
    return task;
  }
}
