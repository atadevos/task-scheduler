import { Task, TaskStatus } from '../../entities/task.entity';

export interface TaskFilter {
  status?: TaskStatus;
  assignedUserId?: number;
  search?: string;
  currentUserRole?: string;
  currentUserId?: number;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface ITaskRepository {
  findAll(filter?: TaskFilter): Promise<Task[]>;
  findOne(id: number): Promise<Task | null>;
  findOneWithAssignedBy(id: number): Promise<Task | null>;
  findOneWithAllRelations(id: number): Promise<Task | null>;
  create(taskData: Partial<Task>): Promise<Task>;
  update(id: number, taskData: Partial<Task>): Promise<Task>;
  delete(id: number): Promise<void>;
  save(task: Task): Promise<Task>;
  hasOverlappingTasks(
    userId: number,
    startDate: Date,
    endDate: Date,
    excludeTaskId: number | null,
  ): Promise<boolean>;
  getUserTasksForAvailability(userId: number): Promise<Task[]>;
  findTasksWithComplexFilter(filter: TaskFilter): Promise<Task[]>;
}
