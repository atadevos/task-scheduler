import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum TaskStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity('tasks')
@Index(['assignedUserId', 'startDate', 'endDate'])
@Index(['status'])
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'assigned_user_id', nullable: true })
  assignedUserId?: number;

  @Column({ name: 'assigned_by_id', nullable: true })
  assignedById?: number;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.IN_PROGRESS,
  })
  status!: TaskStatus;

  @Column({ name: 'start_date', type: 'datetime' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'datetime' })
  endDate!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.tasks, { nullable: true, eager: true })
  @JoinColumn({ name: 'assigned_user_id' })
  assignedUser?: User;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'assigned_by_id' })
  assignedBy?: User;
}

