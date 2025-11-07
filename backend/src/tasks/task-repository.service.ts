import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Task, TaskStatus } from '../entities/task.entity';
import { User, UserRole } from '../entities/user.entity';
import { TaskOperationException, TaskInfrastructureException } from './task-exceptions';
import { ITaskRepository, TaskFilter } from './interfaces/task-repository.interface';

@Injectable()
export class TaskRepositoryService implements ITaskRepository {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(filter?: TaskFilter): Promise<Task[]> {
    if (!filter) {
      return this.tasksRepository.find({
        relations: ['assignedUser'],
        order: { createdAt: 'DESC' },
      });
    }

    // Use the complex filter method for detailed filtering
    return this.findTasksWithComplexFilter(filter);
  }

  async findOne(id: number): Promise<Task | null> {
    return this.tasksRepository.findOne({
      where: { id },
    });
  }

  async findOneWithAssignedBy(id: number): Promise<Task | null> {
    return this.tasksRepository.findOne({
      where: { id },
      relations: ['assignedBy'], // assignedUser is eager, so no need to specify
    });
  }

  async findOneWithAllRelations(id: number): Promise<Task | null> {
    return this.tasksRepository.findOne({
      where: { id },
      relations: ['assignedUser', 'assignedBy'],
    });
  }

  async create(taskData: Partial<Task>): Promise<Task> {
    try {
      const task = this.tasksRepository.create(taskData);
      return await this.tasksRepository.save(task);
    } catch (error) {
      throw new TaskInfrastructureException('TaskRepository', 'create task', error);
    }
  }

  async update(id: number, taskData: Partial<Task>): Promise<Task> {
    try {
      await this.tasksRepository.update(id, taskData);
      const updatedTask = await this.findOne(id);
      if (!updatedTask) {
        throw new TaskOperationException('update', id, 'task not found after update');
      }
      return updatedTask;
    } catch (error) {
      if (error instanceof TaskOperationException) {
        throw error;
      }
      throw new TaskInfrastructureException('TaskRepository', 'update task', error);
    }
  }

  async delete(id: number): Promise<void> {
    const task = await this.findOne(id);
    if (task) {
      await this.tasksRepository.remove(task);
    }
  }

  async findUserById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
    });
  }

  async save(task: Task): Promise<Task> {
    try {
      return await this.tasksRepository.save(task);
    } catch (error) {
      throw new TaskInfrastructureException('TaskRepository', 'save task', error);
    }
  }

  /**
   * Check if a user has overlapping tasks during the given date range
   */
  async hasOverlappingTasks(
    userId: number,
    startDate: Date,
    endDate: Date,
    excludeTaskId: number | null = null,
  ): Promise<boolean> {
    try {
      const query = this.tasksRepository
        .createQueryBuilder('task')
        .where('task.assignedUserId = :userId', { userId })
        .andWhere('task.status != :completedStatus', { completedStatus: TaskStatus.COMPLETED })
        .andWhere(
          '(task.startDate <= :endDate AND task.endDate >= :startDate)',
          { startDate, endDate },
        );

      if (excludeTaskId) {
        query.andWhere('task.id != :excludeTaskId', { excludeTaskId });
      }

      const overlappingTasks = await query.getMany();
      return overlappingTasks.length > 0;
    } catch (error) {
      throw new TaskInfrastructureException('TaskRepository', 'check overlapping tasks', error);
    }
  }

  /**
   * Get all tasks for a user ordered by start date (for availability tracking)
   */
  async getUserTasksForAvailability(userId: number): Promise<Task[]> {
    try {
      return await this.tasksRepository.find({
        where: { assignedUserId: userId },
        order: { startDate: 'ASC' },
      });
    } catch (error) {
      throw new TaskInfrastructureException('TaskRepository', 'get user tasks for availability', error);
    }
  }

  /**
   * Get tasks with complex filtering in a single optimized query
   */
  async findTasksWithComplexFilter(filter: TaskFilter): Promise<Task[]> {
    try {
      let query = this.tasksRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.assignedUser', 'assignedUser');

      // Apply filters
      if (filter.status) {
        query = query.andWhere('task.status = :status', { status: filter.status });
      }

      if (filter.assignedUserId) {
        query = query.andWhere('task.assignedUserId = :assignedUserId', {
          assignedUserId: filter.assignedUserId,
        });
      }

      if (filter.currentUserRole === UserRole.USER && filter.currentUserId) {
        query = query.andWhere('task.assignedUserId = :currentUserId', {
          currentUserId: filter.currentUserId,
        });
      }

      if (filter.search) {
        query = query.andWhere(
          '(task.title LIKE :search OR task.description LIKE :search)',
          { search: `%${filter.search}%` },
        );
      }

      if (filter.dateRange) {
        query = query.andWhere('task.startDate >= :startDate AND task.endDate <= :endDate', {
          startDate: filter.dateRange.startDate,
          endDate: filter.dateRange.endDate,
        });
      }

      return await query.orderBy('task.createdAt', 'DESC').getMany();
    } catch (error) {
      throw new TaskInfrastructureException('TaskRepository', 'find tasks with complex filter', error);
    }
  }
}

