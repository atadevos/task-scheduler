import { Injectable } from '@nestjs/common';
import { Task, TaskStatus } from '../entities/task.entity';
import { UserRole } from '../entities/user.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { ReassignTaskDto } from '../dto/reassign-task.dto';
import { TaskDomainService } from './services/task-domain.service';
import { TaskRepositoryService } from './task-repository.service';
import { AppLogger } from '../logger/logger.service';
import { TaskNotFoundException } from './task-exceptions';

@Injectable()
export class TaskBusinessLogicService {
  constructor(
    private taskDomainService: TaskDomainService,
    private taskRepository: TaskRepositoryService,
    private readonly logger: AppLogger,
  ) {}

  async validateTaskCreation(createTaskDto: CreateTaskDto): Promise<void> {
    // Delegate to domain service for comprehensive validation
    await this.taskDomainService.prepareTaskCreation(createTaskDto);
  }

  async validateTaskUpdate(
    taskId: number,
    updateTaskDto: UpdateTaskDto,
    currentUserRole?: string,
    currentUserId?: number,
  ): Promise<Task> {
    // Delegate to domain service for comprehensive validation
    const result = await this.taskDomainService.prepareTaskUpdate(
      taskId,
      updateTaskDto,
      currentUserRole,
      currentUserId,
    );

    return result.task;
  }

  async validateTaskReassignment(
    taskId: number,
    reassignTaskDto: ReassignTaskDto,
  ): Promise<Task> {
    // Delegate to domain service for comprehensive validation
    const result = await this.taskDomainService.prepareTaskReassignment(
      taskId,
      reassignTaskDto,
    );

    return result.task;
  }

  async validateTaskDeletion(taskId: number): Promise<Task> {
    return this.taskDomainService.validateTaskDeletion(taskId);
  }

  // Additional business logic methods can be added here if needed
  // All core validation and data preparation is now handled by TaskDomainService

  buildTaskEntityForCreation(
    taskCreationRequest: CreateTaskDto,
    creatorUserId?: number,
  ): Partial<Task> {
    return {
      ...taskCreationRequest,
      status: taskCreationRequest.status || TaskStatus.IN_PROGRESS,
      startDate: new Date(taskCreationRequest.startDate),
      endDate: new Date(taskCreationRequest.endDate),
      assignedById: creatorUserId,
    };
  }

  buildTaskEntityForUpdate(
    existingTask: Task,
    requestedUpdates: UpdateTaskDto,
    requestingUserId?: number,
  ): Partial<Task> {
    const entityUpdates: Partial<Task> = {};

    // Apply basic field updates
    if (requestedUpdates.title !== undefined) entityUpdates.title = requestedUpdates.title;
    if (requestedUpdates.description !== undefined) entityUpdates.description = requestedUpdates.description;
    if (requestedUpdates.status !== undefined) entityUpdates.status = requestedUpdates.status;

    // Convert date strings to Date objects if provided
    if (requestedUpdates.startDate) {
      entityUpdates.startDate = new Date(requestedUpdates.startDate);
    }
    if (requestedUpdates.endDate) {
      entityUpdates.endDate = new Date(requestedUpdates.endDate);
    }

    // Handle reassignment case - update the task entity directly for foreign key changes
    if (requestedUpdates.assignedUserId && requestedUpdates.assignedUserId !== existingTask.assignedUserId) {
      existingTask.assignedUser = undefined as any; // Clear relation to force TypeORM update
      existingTask.assignedUserId = requestedUpdates.assignedUserId;
      existingTask.assignedById = requestingUserId;
      // Don't include assignedUserId in entityUpdates since we set it directly on the entity
    }

    return entityUpdates;
  }

  buildTaskEntityForReassignment(
    targetTask: Task,
    reassignmentRequest: ReassignTaskDto,
    requestingUserId?: number,
  ): Partial<Task> {
    return {
      assignedUserId: reassignmentRequest.assignedUserId,
      assignedById: requestingUserId,
    };
  }
}
