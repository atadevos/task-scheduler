import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin', 'manager')
  async findAll(@CurrentUser() user: any) {
    return this.usersService.findAll(user?.role, user?.userId);
  }

  @Get(':id')
  @Roles('admin', 'manager')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager')
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() user: any,
  ) {
    return this.usersService.create(createUserDto, user?.role);
  }

  @Put(':id')
  @Roles('admin', 'manager')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    // Managers cannot update admins or other managers
    if (user?.role === 'manager') {
      const targetUser = await this.usersService.findOne(id);
      if (targetUser.role === 'admin' || targetUser.role === 'manager') {
        throw new ForbiddenException('Managers can only update ordinary users');
      }
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    await this.usersService.remove(id, user?.role);
    return { message: 'User deleted successfully' };
  }
}

