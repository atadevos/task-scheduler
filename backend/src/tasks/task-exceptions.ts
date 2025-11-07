import { BadRequestException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';

// Business Logic Exceptions (400-499 status codes)
export class TaskNotFoundException extends BadRequestException {
  constructor(taskId: number) {
    super(`Task with id ${taskId} not found`);
  }
}

export class TaskValidationException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}

export class TaskOverlapException extends BadRequestException {
  constructor() {
    super('User already has an overlapping task during this time period');
  }
}

export class TaskPermissionException extends ForbiddenException {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message);
  }
}

// System/Operational Exceptions (500 status codes)
export class TaskOperationException extends InternalServerErrorException {
  constructor(operation: string, taskId?: number, details?: string) {
    const message = taskId
      ? `Failed to ${operation} task with id ${taskId}${details ? `: ${details}` : ''}`
      : `Failed to ${operation} task${details ? `: ${details}` : ''}`;
    super(message);
  }
}

export class TaskInfrastructureException extends InternalServerErrorException {
  constructor(service: string, operation: string, error?: any) {
    const message = `Infrastructure error in ${service} during ${operation}`;
    super(message);
    this.cause = error;
  }
}

export class TaskNotificationException extends InternalServerErrorException {
  constructor(operation: string, userId: number, error?: any) {
    super(`Failed to send ${operation} notification to user ${userId}`);
    this.cause = error;
  }
}
