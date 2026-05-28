import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { DriverHours, SessionType } from './driver-hours.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

// AETR / EU 561/2006 limits
const AETR_RULES = {
  maxDrivingBeforeBreak: 4.5 * 60,  // 4.5 hours = 270 minutes
  breakDuration: 45,                 // 45 minutes break
  maxDailyDriving: 9 * 60,          // 9 hours (extendable to 10h twice/week)
  maxWeeklyDriving: 56 * 60,        // 56 hours
  dailyRest: 11 * 60,               // 11 hours continuous rest
  reducedRest: 9 * 60,              // 9 hours (max 3x/week)
};

export interface DriverStatus {
  driverId: string;
  currentSession: SessionType;
  sessionStart: Date;
  drivingToday: number;
  drivingThisWeek: number;
  remainingBeforeBreak: number;
  remainingToday: number;
  nextBreakRequired: Date | null;
  violations: string[];
  isCompliant: boolean;
}

@Injectable()
export class DriverHoursService {
  private readonly logger = new Logger(DriverHoursService.name);

  constructor(
    @InjectRepository(DriverHours)
    private hoursRepo: Repository<DriverHours>,
    private eventEmitter: EventEmitter2,
  ) {}

  /** Start a driving session */
  async startDriving(driverId: string, vehicleId?: string, loadId?: string, odometerKm?: number) {
    // Close any open sessions
    await this.closeOpenSessions(driverId);

    const session = this.hoursRepo.create({
      driverId,
      type: SessionType.DRIVING,
      startTime: new Date(),
      vehicleId,
      loadId,
      startOdometerKm: odometerKm,
    });
    await this.hoursRepo.save(session);

    const status = await this.getDriverStatus(driverId);
    this.eventEmitter.emit('driver.started_driving', { driverId, status });

    return { session, status };
  }

  /** End current driving, start rest */
  async startRest(driverId: string, odometerKm?: number) {
    const active = await this.hoursRepo.findOne({
      where: { driverId, endTime: null as any },
      order: { startTime: 'DESC' },
    });

    if (active) {
      const endTime = new Date();
      active.endTime = endTime;
      active.durationMinutes = Math.round((endTime.getTime() - active.startTime.getTime()) / 60000);
      if (active.type === SessionType.DRIVING && odometerKm && active.startOdometerKm) {
        active.endOdometerKm = odometerKm;
      }
      await this.hoursRepo.save(active);
    }

    const rest = this.hoursRepo.create({
      driverId,
      type: SessionType.REST,
      startTime: new Date(),
    });
    await this.hoursRepo.save(rest);

    return this.getDriverStatus(driverId);
  }

  /** Start a break session */
  async startBreak(driverId: string) {
    await this.closeOpenSessions(driverId);

    const brk = this.hoursRepo.create({
      driverId,
      type: SessionType.BREAK,
      startTime: new Date(),
    });
    await this.hoursRepo.save(brk);
    return this.getDriverStatus(driverId);
  }

  /** Get comprehensive driver compliance status */
  async getDriverStatus(driverId: string): Promise<DriverStatus> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());

    // Get today's sessions
    const todaySessions = await this.hoursRepo.find({
      where: { driverId, startTime: MoreThanOrEqual(todayStart) },
      order: { startTime: 'ASC' },
    });

    // Get this week's sessions
    const weekSessions = await this.hoursRepo.find({
      where: { driverId, startTime: MoreThanOrEqual(weekStart) },
    });

    const drivingToday = todaySessions
      .filter((s) => s.type === SessionType.DRIVING)
      .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    const drivingThisWeek = weekSessions
      .filter((s) => s.type === SessionType.DRIVING)
      .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    // Find current active session
    const activeSession = todaySessions.find((s) => !s.endTime);
    const currentSession = activeSession?.type || SessionType.AVAILABLE;

    // Calculate continuous driving (since last break/rest of 45+ min)
    let continuousDriving = 0;
    let lastBreakTime: Date | null = null;
    for (let i = todaySessions.length - 1; i >= 0; i--) {
      const s = todaySessions[i];
      if (s.type === SessionType.BREAK || s.type === SessionType.REST) {
        if (s.durationMinutes >= 45) {
          lastBreakTime = s.endTime;
          break;
        }
      }
    }

    const afterBreak = todaySessions.filter(
      (s) => s.type === SessionType.DRIVING && (!lastBreakTime || s.startTime > lastBreakTime),
    );
    continuousDriving = afterBreak.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    // If currently driving, add elapsed time
    if (activeSession?.type === SessionType.DRIVING && activeSession.startTime) {
      const elapsed = Math.round((now.getTime() - activeSession.startTime.getTime()) / 60000);
      continuousDriving += elapsed;
    }

    // Detect violations
    const violations: string[] = [];
    const remainingBeforeBreak = Math.max(0, AETR_RULES.maxDrivingBeforeBreak - continuousDriving);
    const remainingToday = Math.max(0, AETR_RULES.maxDailyDriving - drivingToday);

    if (continuousDriving >= AETR_RULES.maxDrivingBeforeBreak) {
      violations.push(`Maksimum sürüş süresi aşıldı (${Math.round(continuousDriving / 60 * 10) / 10}sa / 4.5sa limit)`);
    } else if (remainingBeforeBreak <= 30) {
      violations.push(`Mola vermeniz gerekiyor! ${Math.round(remainingBeforeBreak)} dk kaldı`);
    }

    if (drivingToday >= AETR_RULES.maxDailyDriving) {
      violations.push(`Günlük sürüş limiti aşıldı (${Math.round(drivingToday / 60 * 10) / 10}sa / 9sa)`);
    }

    if (drivingThisWeek >= AETR_RULES.maxWeeklyDriving) {
      violations.push(`Haftalık sürüş limiti aşıldı (${Math.round(drivingThisWeek / 60)}sa / 56sa)`);
    }

    // Next break time
    const nextBreakRequired = activeSession?.type === SessionType.DRIVING && activeSession.startTime
      ? new Date(activeSession.startTime.getTime() + AETR_RULES.maxDrivingBeforeBreak * 60000)
      : null;

    const isCompliant = violations.filter((v) => v.includes('aşıldı')).length === 0;

    return {
      driverId,
      currentSession,
      sessionStart: activeSession?.startTime || now,
      drivingToday,
      drivingThisWeek,
      remainingBeforeBreak,
      remainingToday,
      nextBreakRequired,
      violations,
      isCompliant,
    };
  }

  /** Get weekly log for driver */
  async getWeeklyLog(driverId: string) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const sessions = await this.hoursRepo.find({
      where: { driverId, startTime: MoreThanOrEqual(weekStart) },
      order: { startTime: 'ASC' },
    });

    const dailySummary: Record<string, { driving: number; rest: number; break: number; work: number }> = {};
    for (const s of sessions) {
      const day = s.startTime.toISOString().split('T')[0];
      if (!dailySummary[day]) dailySummary[day] = { driving: 0, rest: 0, break: 0, work: 0 };
      const typeKey = s.type as string;
      if (typeKey in dailySummary[day]) (dailySummary[day] as any)[typeKey] += s.durationMinutes || 0;
    }

    return {
      driverId,
      weekStart: weekStart.toISOString().split('T')[0],
      dailySummary,
      sessions: sessions.slice(0, 100),
      limits: AETR_RULES,
    };
  }

  private async closeOpenSessions(driverId: string) {
    const open = await this.hoursRepo.find({
      where: { driverId, endTime: null as any },
    });
    for (const s of open) {
      s.endTime = new Date();
      s.durationMinutes = Math.round((s.endTime.getTime() - s.startTime.getTime()) / 60000);
      await this.hoursRepo.save(s);
    }
  }
}
