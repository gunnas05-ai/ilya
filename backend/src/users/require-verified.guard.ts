import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class RequireVerifiedGuard implements CanActivate {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException('Giris yapilmamis');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.profileStatus !== 'VERIFIED') {
      throw new ForbiddenException({
        message: 'Profiliniz henuz onaylanmadi. Yuk alabilmek icin profilinizi tamamlayin.',
        code: 'PROFILE_NOT_VERIFIED',
        profileStatus: user?.profileStatus || 'INCOMPLETE',
        missingFields: user?.missingFields || [],
      });
    }

    return true;
  }
}
