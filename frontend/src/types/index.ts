export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  createdAt?: string;
  updatedAt?: string;
}

export enum TaskStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  assignedUserId?: number;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  createdAt?: string;
  updatedAt?: string;
  assignedUser?: User;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

