import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';

@Controller('health')
export class HealthController {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  @Get()
  async check() {
    const adminCount = await this.usersRepository.count({
      where: { role: UserRole.ADMIN },
    });

    const isSetup = adminCount > 0;

    return {
      status: isSetup ? 'ok' : 'setup_required',
      adminExists: isSetup,
      message: isSetup
        ? 'Application is ready'
        : 'Setup required: No admin user found. Please configure an admin user in backend/config/initial-data.json and restart the application.',
    };
  }
}

