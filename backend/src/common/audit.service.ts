import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog, SecurityEvent } from './admin-audit.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AdminAuditLog) private auditRepo: Repository<AdminAuditLog>,
    @InjectRepository(SecurityEvent) private securityRepo: Repository<SecurityEvent>,
  ) {}

  async logAdminAction(params: {
    adminId: string;
    adminEmail: string;
    action: string;
    description: string;
    targetUserId?: string;
    targetUserEmail?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
  }) {
    const log = this.auditRepo.create(params);
    await this.auditRepo.save(log);
  }

  async logSecurityEvent(params: {
    userId?: string;
    eventType: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
  }) {
    const event = this.securityRepo.create(params);
    await this.securityRepo.save(event);
  }

  async getAuditLogs(page = 1, limit = 50): Promise<{ logs: AdminAuditLog[]; total: number }> {
    const [logs, total] = await this.auditRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { logs, total };
  }

  async getSecurityEvents(page = 1, limit = 50): Promise<{ events: SecurityEvent[]; total: number }> {
    const [events, total] = await this.securityRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { events, total };
  }
}
