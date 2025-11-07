import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AppLogger } from '../logger/logger.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'your-super-secret-jwt-key-change-in-production',
      ),
    });
  }

  async validate(payload: any) {
    // Verify that the user still exists in the database
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      this.logger.warn(
        `JWT validation failed: user ${payload.sub} (${payload.email}) not found in database`,
        'JwtStrategy',
      );
      throw new UnauthorizedException('User no longer exists');
    }

    // Return user data for use in controllers
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
  }
}

