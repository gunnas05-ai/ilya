import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { HealthMonitoringService } from './health-monitoring.service';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@ApiTags('admin')
@Controller({ path: 'admin/security', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
@ApiBearerAuth()
export class AdminSecurityController {
  constructor(
    private readonly auditService: AuditService,
    private readonly healthService: HealthMonitoringService,
  ) {}

  @Get('audit-logs')
  @ApiOperation({ summary: 'Admin islem gecmisi' })
  async getAuditLogs(@Query('page') page = '1', @Query('limit') limit = '50') {
    return this.auditService.getAuditLogs(parseInt(page), parseInt(limit));
  }

  @Get('security-events')
  @ApiOperation({ summary: 'Guvenlik olaylari' })
  async getSecurityEvents(@Query('page') page = '1', @Query('limit') limit = '50') {
    return this.auditService.getSecurityEvents(parseInt(page), parseInt(limit));
  }

  @Post('backup')
  @ApiOperation({ summary: 'SQLite veritabani yedegi al' })
  async createBackup(@Req() req: any) {
    try {
      const dbPath = path.join(process.cwd(), 'data', 'kaptan.db');
      if (!fs.existsSync(dbPath)) {
        return { success: false, message: 'Veritabani dosyasi bulunamadi (SQLite modunda calisiyor olun)' };
      }

      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `kaptan-backup-${timestamp}.db`);

      await execAsync(`copy "${dbPath}" "${backupPath}"`);

      // Audit log
      await this.auditService.logAdminAction({
        adminId: req.user.id,
        adminEmail: req.user.email,
        action: 'backup_created',
        description: `Veritabani yedegi olusturuldu: ${backupPath}`,
        ipAddress: req.ip,
      });

      return {
        success: true,
        data: {
          path: backupPath,
          size: fs.statSync(backupPath).size,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  @Get('backups')
  @ApiOperation({ summary: 'Mevcut yedekleri listele' })
  async listBackups() {
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) return { success: true, data: [] };

    const files = fs.readdirSync(backupDir)
      .filter((f) => f.endsWith('.db'))
      .map((f) => {
        const fp = path.join(backupDir, f);
        const stat = fs.statSync(fp);
        return { name: f, size: stat.size, createdAt: stat.birthtime };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { success: true, data: files };
  }
}
