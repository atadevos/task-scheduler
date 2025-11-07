import { IsInt, IsNotEmpty } from 'class-validator';

export class ReassignTaskDto {
  @IsInt()
  @IsNotEmpty()
  assignedUserId: number;
}

