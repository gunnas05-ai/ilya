import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ROLES_KEY, PERMISSIONS_KEY } from './roles.decorator';
import { RolePermission } from './role-permission.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(RolePermission)
    private rolePermRepo: Repository<RolePermission>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No restrictions — public endpoint
    if (!requiredRoles && !requiredPermissions) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // Super admin bypasses all checks
    if (user.role === 'super_admin') return true;

    // Role-based check
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) return false;
    }

    // Permission-based check (granular)
    if (requiredPermissions && requiredPermissions.length > 0) {
      const now = new Date();
      const userPermissions = await this.rolePermRepo.find({
        where: { role: user.role },
        relations: ['permission'],
      });
      // Gecici yetkileri filtrele — suresi dolmus olanlari gec
      const userPermKeys = userPermissions
        .filter((rp) => !rp.expiresAt || rp.expiresAt > now)
        .map((rp) => rp.permission.key);

      const hasAllPermissions = requiredPermissions.every((perm) =>
        userPermKeys.includes(perm),
      );
      if (!hasAllPermissions) return false;
    }

    return true;
  }
}
