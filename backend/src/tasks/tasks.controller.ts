import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { ReassignTaskDto } from '../dto/reassign-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TaskStatus } from '../entities/task.entity';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async findAll(
    @Query('status') status?: TaskStatus,
    @Query('assignedUserId', new ParseIntPipe({ optional: true })) assignedUserId?: number,
    @Query('search') search?: string,
    @CurrentUser() user?: any,
  ) {
    return this.tasksService.findAll(
      status,
      assignedUserId,
      search,
      user?.role,
      user?.userId,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user?: any,
  ) {
    return this.tasksService.create(createTaskDto, user?.userId);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user?: any,
  ) {
    return this.tasksService.update(id, updateTaskDto, user?.userId, user?.role);
  }

  @Put(':id/reassign')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async reassign(
    @Param('id', ParseIntPipe) id: number,
    @Body() reassignTaskDto: ReassignTaskDto,
    @CurrentUser() user?: any,
  ) {
    return this.tasksService.reassign(id, reassignTaskDto, user?.userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.tasksService.remove(id);
    return { message: 'Task deleted successfully' };
  }
}

