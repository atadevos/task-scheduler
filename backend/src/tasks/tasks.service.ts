import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Task, TaskStatus } from '../entities/task.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { ReassignTaskDto } from '../dto/reassign-task.dto';
import { TaskRepositoryService } from './task-repository.service';
import { TaskBusinessLogicService } from './task-business-logic.service';
import { TaskDomainService } from './services/task-domain.service';
import { TaskNotificationService } from './task-notification.service';
import { TaskOperationException, TaskInfrastructureException } from './task-exceptions';
import { AppLogger } from '../logger/logger.service';
import { UserRole } from '../entities/user.entity';

interface TaskUpdateContext {
  task: Task;
  updates: Partial<Task>;
  oldAssignedUserId?: number;
  oldStatus: TaskStatus;
}

@Injectable()
export class TasksService {
  constructor(
    private taskRepository: TaskRepositoryService,
    private taskBusinessLogic: TaskBusinessLogicService,
    private taskDomainService: TaskDomainService,
    private taskNotification: TaskNotificationService,
    @InjectQueue('availability') private availabilityQueue: Queue,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async findAll(
    status?: TaskStatus,
    assignedUserId?: number,
    search?: string,
    currentUserRole?: UserRole,
    currentUserId?: number,
  ): Promise<Task[]> {
    this.logger.debug(
      `Fetching tasks with filters: status=${status}, assignedUserId=${assignedUserId}, search=${search}`,
      'TasksService',
    );

    const filter = {
      status,
      assignedUserId,
      search,
      currentUserRole,
      currentUserId,
    };

    const tasks = await this.taskDomainService.findTasks(filter);

    this.logger.debug(`Found ${tasks.length} task(s)`, 'TasksService');
    return tasks;
  }

  async findOne(id: number): Promise<Task | null> {
    return this.taskRepository.findOne(id);
  }

  async create(createTaskDto: CreateTaskDto, currentUserId?: number): Promise<Task> {
    this.logger.info(
      `Creating task: ${createTaskDto.title} for user ${createTaskDto.assignedUserId}`,
      'TasksService',
    );

    // Validate business rules
    await this.taskBusinessLogic.validateTaskCreation(createTaskDto);

    // Prepare task data
    const taskData = this.taskBusinessLogic.buildTaskEntityForCreation(
      createTaskDto,
      currentUserId,
    );

    // Create task
    const savedTask = await this.taskRepository.create(taskData);

    // Trigger background job to update availability
    await this.queueAvailabilityUpdate(savedTask.assignedUserId);

    // Reload task with relations
    const result = await this.reloadTaskWithRelations(savedTask.id, 'created');

    this.logger.info(
      `Task created successfully: ${result.id} - ${result.title}`,
      'TasksService',
      { taskId: result.id, assignedUserId: result.assignedUserId },
    );

    // Send notification
    await this.taskNotification.notifyTaskCreated(result);

    return result;
  }

  async update(
    id: number,
    updateTaskDto: UpdateTaskDto,
    currentUserId?: number,
    currentUserRole?: UserRole,
  ): Promise<Task> {
    this.logger.debug(`Updating task: ${id}`, 'TasksService');

    // Step 1: Validate and prepare for update
    const updateContext = await this.prepareTaskUpdate(id, updateTaskDto, currentUserId, currentUserRole);

    // Step 2: Execute the update
    const updatedTask = await this.executeTaskUpdate(updateContext);

    // Step 3: Handle side effects
    await this.handleTaskUpdateSideEffects(updateContext, updatedTask, updateTaskDto);

    this.logger.info(`Task updated successfully: ${updatedTask.id}`, 'TasksService', {
      taskId: updatedTask.id,
        });

    return updatedTask;
        }

  private async prepareTaskUpdate(
    id: number,
    updateTaskDto: UpdateTaskDto,
    currentUserId?: number,
    currentUserRole?: UserRole,
  ): Promise<TaskUpdateContext> {
    // Validate business rules
    const task = await this.taskBusinessLogic.validateTaskUpdate(
      id,
      updateTaskDto,
      currentUserRole,
      currentUserId,
        );

    // Store old values for comparison
    const oldAssignedUserId = task.assignedUserId;
    const oldStatus = task.status;

    // Prepare update data
    const updates = this.taskBusinessLogic.buildTaskEntityForUpdate(
      task,
      updateTaskDto,
      currentUserId,
    );

    return {
      task,
      updates,
      oldAssignedUserId,
      oldStatus,
    };
  }

  private async executeTaskUpdate(context: TaskUpdateContext): Promise<Task> {
    // Apply updates and save
    const savedTask = await this.saveAndReloadTask(context.task, context.updates);

    // Reload task with relations
    return this.reloadTaskWithRelations(savedTask.id, 'updated');
      }

  private async handleTaskUpdateSideEffects(
    context: TaskUpdateContext,
    updatedTask: Task,
    updateTaskDto: UpdateTaskDto,
  ): Promise<void> {
    // Trigger background jobs for availability updates
    await this.handleAvailabilityUpdates(
      updateTaskDto,
      context.oldAssignedUserId,
      updatedTask.assignedUserId,
    );

    // Send notifications
    await this.handleUpdateNotifications(updatedTask, updateTaskDto, context.oldStatus);
  }

  private async handleAvailabilityUpdates(
    updateTaskDto: UpdateTaskDto,
    oldAssignedUserId?: number,
    newAssignedUserId?: number,
  ): Promise<void> {
    // Always trigger for the assigned user (if dates changed or user reassigned)
    if (newAssignedUserId && (updateTaskDto.startDate || updateTaskDto.endDate || updateTaskDto.assignedUserId)) {
      await this.queueAvailabilityUpdate(newAssignedUserId);
    }
    // Also update old user's availability if reassigned
    if (updateTaskDto.assignedUserId && oldAssignedUserId && oldAssignedUserId !== newAssignedUserId) {
      await this.queueAvailabilityUpdate(oldAssignedUserId);
    }
  }

  private async handleUpdateNotifications(
    task: Task,
    updateTaskDto: UpdateTaskDto,
    oldStatus: TaskStatus,
  ): Promise<void> {
    // Send completion notification to assigner
    if (
      updateTaskDto.status === TaskStatus.COMPLETED &&
      oldStatus !== TaskStatus.COMPLETED
    ) {
      await this.taskNotification.notifyTaskCompleted(task);
    }
  }

  private async queueAvailabilityUpdate(userId?: number): Promise<void> {
    if (userId) {
      try {
        await this.availabilityQueue.add('update-availability', {
          userId,
        });
      } catch (error) {
        // Log the error but don't fail the operation - background job failures shouldn't break business logic
        this.logger.error(
          `Failed to queue availability update for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
          'TasksService',
        );
      }
    }
  }

  private async saveAndReloadTask(task: Task, updates: Partial<Task>): Promise<Task> {
    Object.assign(task, updates);
    return this.taskRepository.save(task);
    }

  private async reloadTaskWithRelations(taskId: number, operation: string, loadAllRelations: boolean = true): Promise<Task> {
    try {
      const result = loadAllRelations
        ? await this.taskRepository.findOneWithAllRelations(taskId)
        : await this.taskRepository.findOne(taskId);

      if (!result) {
        throw new TaskOperationException(operation, taskId, 'task not found after operation');
      }
      return result;
    } catch (error) {
      if (error instanceof TaskOperationException) {
        throw error;
      }
      // Handle infrastructure errors (database connection issues, etc.)
      throw new TaskInfrastructureException('TaskRepository', `reload ${operation} task`, error);
      }
    }

  async reassign(id: number, reassignTaskDto: ReassignTaskDto, currentUserId?: number): Promise<Task> {
    // Validate business rules
    const task = await this.taskBusinessLogic.validateTaskReassignment(id, reassignTaskDto);

    const oldAssignedUserId = task.assignedUserId;

    // Prepare reassignment data
    const updates = this.taskBusinessLogic.buildTaskEntityForReassignment(
      task,
      reassignTaskDto,
      currentUserId,
    );

    // Apply updates and save
    const savedTask = await this.saveAndReloadTask(task, updates);

    // Trigger background jobs for availability updates
    await this.queueAvailabilityUpdate(savedTask.assignedUserId);
    if (oldAssignedUserId && oldAssignedUserId !== savedTask.assignedUserId) {
      await this.queueAvailabilityUpdate(oldAssignedUserId);
    }

    // Reload task with relations
      const result = await this.reloadTaskWithRelations(savedTask.id, 'reassigned', false);

    // Send notification
    await this.taskNotification.notifyTaskReassigned(result, oldAssignedUserId);

    return result;
  }

  async remove(id: number): Promise<void> {
    this.logger.debug(`Deleting task: ${id}`, 'TasksService');

    const task = await this.taskBusinessLogic.validateTaskDeletion(id);

    const assignedUserId = task.assignedUserId;

    await this.taskRepository.delete(id);

    // Trigger background job to update availability
    await this.queueAvailabilityUpdate(assignedUserId);

    this.logger.info(`Task deleted successfully: ${id}`, 'TasksService', {
      taskId: id,
      assignedUserId,
    });

    // Send notification
    await this.taskNotification.notifyTaskDeleted(task);
  }

}

