import { Controller, Get, Post, Put, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CrashReport } from './crash-report.entity';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@ApiTags('admin')
@Controller({ path: 'admin/crash-reports', version: '1' })
@ApiBearerAuth()
export class CrashReportController {
  constructor(
    @InjectRepository(CrashReport) private crashRepo: Repository<CrashReport>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Mobil uygulamadan crash raporu gonder' })
  async submit(@Body() body: {
    errorMessage: string; stackTrace?: string; screen?: string;
    platform?: string; appVersion?: string; userId?: string; userEmail?: string;
  }, @Req() req: any) {
    // Ayni hatanin tekrar gelmesi durumunda occurrenceCount artir
    const existing = await this.crashRepo.findOne({
      where: { errorMessage: body.errorMessage, status: 'new' },
    });

    if (existing) {
      existing.occurrenceCount += 1;
      existing.lastOccurredAt = new Date();
      if (body.stackTrace) existing.stackTrace = body.stackTrace;
      await this.crashRepo.save(existing);
      return { success: true, data: existing, deduplicated: true };
    }

    const report = this.crashRepo.create({
      errorMessage: body.errorMessage,
      stackTrace: body.stackTrace || undefined,
      screen: body.screen || undefined,
      platform: body.platform || 'unknown',
      appVersion: body.appVersion || undefined,
      userId: body.userId || undefined,
      userEmail: body.userEmail || undefined,
      environment: process.env.NODE_ENV || 'development',
    } as any);

    await this.crashRepo.save(report);
    return { success: true, data: report };
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Crash raporlarini listele' })
  async list(@Param('status') status?: string) {
    const where: any = {};
    if (status) where.status = status;
    const reports = await this.crashRepo.find({
      where,
      order: { occurrenceCount: 'DESC', lastOccurredAt: 'DESC' },
      take: 100,
    });
    return { success: true, data: reports };
  }

  @Put(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Crash raporu durumunu guncelle' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    await this.crashRepo.update(id, { status: status as any });
    return { success: true };
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Crash istatistikleri' })
  async getStats() {
    const [total, newCount, resolved] = await Promise.all([
      this.crashRepo.count(),
      this.crashRepo.count({ where: { status: 'new' } }),
      this.crashRepo.count({ where: { status: 'resolved' } }),
    ]);
    const topCrashes = await this.crashRepo.find({
      order: { occurrenceCount: 'DESC' },
      take: 5,
    });
    return { success: true, data: { total, newCount, resolved, topCrashes } };
  }
}
