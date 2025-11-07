import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { LoginDto } from '../dto/login.dto';
import { AppLogger } from '../logger/logger.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    this.logger.debug(`Validating user: ${email}`, 'AuthService');

    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      this.logger.warn(`User not found: ${email}`, 'AuthService');
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user: ${email}`, 'AuthService');
      return null;
    }

    this.logger.debug(`User validated successfully: ${email}`, 'AuthService');
    const { passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    this.logger.info(`Login attempt for: ${loginDto.email}`, 'AuthService');

    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      this.logger.warn(`Failed login attempt for: ${loginDto.email}`, 'AuthService');
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id, role: user.role, name: user.name };
    const accessToken = this.jwtService.sign(payload);

    this.logger.info(`Successful login for user: ${user.email} (${user.id})`, 'AuthService', {
      userId: user.id,
      role: user.role,
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}

