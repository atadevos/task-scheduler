import { Task } from '../../entities/task.entity';

export interface ITaskNotificationService {
  notifyTaskCreated(task: Task): Promise<void>;
  notifyTaskCompleted(task: Task): Promise<void>;
  notifyTaskReassigned(task: Task, oldAssignedUserId?: number): Promise<void>;
  notifyTaskDeleted(task: Task): Promise<void>;
}
