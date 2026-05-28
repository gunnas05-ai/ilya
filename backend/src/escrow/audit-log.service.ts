import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';
export { AuditAction };

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async log(action: AuditAction, userId: string, targetId?: string, targetType?: string, metadata?: any, ipAddress?: string, userAgent?: string) {
    const entry = this.auditRepo.create({ action, userId, targetId, targetType, metadata, ipAddress, userAgent });
    return this.auditRepo.save(entry);
  }

  async getByTarget(targetId: string, targetType?: string) {
    const where: any = { targetId };
    if (targetType) where.targetType = targetType;
    return this.auditRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async getByUser(userId: string, limit = 50) {
    return this.auditRepo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: limit });
  }

  async getByAction(action: AuditAction, limit = 50) {
    return this.auditRepo.find({ where: { action }, order: { createdAt: 'DESC' }, take: limit });
  }
}
