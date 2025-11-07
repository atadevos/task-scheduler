import { Injectable, Inject } from '@nestjs/common';
import { Task } from '../entities/task.entity';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AppLogger } from '../logger/logger.service';
import { ITaskNotificationService } from './interfaces/task-notification.interface';

@Injectable()
export class TaskNotificationService implements ITaskNotificationService {
  constructor(
    private notificationsGateway: NotificationsGateway,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async notifyTaskCreated(task: Task): Promise<void> {
    if (!task.assignedUserId) {
      return;
    }

    this.logger.info(
      `Attempting to send WebSocket notification for task creation to user ${task.assignedUserId}`,
      'TaskNotificationService',
    );

    try {
      this.notificationsGateway.notifyUser(
        task.assignedUserId,
        'task:created',
        {
          task: this.formatTaskForNotification(task),
          message: `New task "${task.title}" has been assigned to you`,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send task creation notification: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        'TaskNotificationService',
      );
    }
  }

  async notifyTaskCompleted(task: Task): Promise<void> {
    if (!task.assignedById) {
      return;
    }

    this.logger.info(
      `Task ${task.id} marked as completed, notifying assigner ${task.assignedById}`,
      'TaskNotificationService',
    );

    try {
      this.notificationsGateway.notifyUser(
        task.assignedById,
        'task:completed',
        {
          task: this.formatTaskForNotification(task),
          message: `Task "${task.title}" has been completed by ${task.assignedUser?.name || 'the assigned user'}`,
        },
      );
      this.logger.info(
        `Sent completion notification to assigner ${task.assignedById}`,
        'TaskNotificationService',
      );
    } catch (error) {
      this.logger.error(
        `Failed to send completion notification: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        'TaskNotificationService',
      );
    }
  }

  async notifyTaskReassigned(task: Task, oldAssignedUserId?: number): Promise<void> {
    if (!task.assignedUserId || task.assignedUserId === oldAssignedUserId) {
      return;
    }

    this.logger.info(
      `Attempting to send WebSocket notification for task reassignment to user ${task.assignedUserId}`,
      'TaskNotificationService',
    );

    try {
      this.notificationsGateway.notifyUser(
        task.assignedUserId,
        'task:reassigned',
        {
          task: this.formatTaskForNotification(task),
          message: `Task "${task.title}" has been reassigned to you`,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send task reassignment notification: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        'TaskNotificationService',
      );
    }
  }

  async notifyTaskDeleted(task: Task): Promise<void> {
    if (!task.assignedUserId) {
      return;
    }

    this.logger.info(
      `Attempting to send WebSocket notification for task deletion to user ${task.assignedUserId}`,
      'TaskNotificationService',
    );

    try {
      this.notificationsGateway.notifyUser(
        task.assignedUserId,
        'task:deleted',
        {
          task: this.formatTaskForNotification(task),
          message: `Task "${task.title}" assigned to you has been deleted`,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send task deletion notification: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        'TaskNotificationService',
      );
    }
  }

  private formatTaskForNotification(task: Task) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      startDate: task.startDate,
      endDate: task.endDate,
      status: task.status,
    };
  }
}
