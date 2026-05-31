import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InstantBooking, BookingStatus } from './instant-booking.entity';
import { WebSocketGateway } from '../websocket/websocket.gateway';

const LOCK_TIMEOUT_MINUTES = parseInt(process.env.INSTANT_BOOK_LOCK_MINUTES || '5', 10);
const PLATFORM_COMMISSION = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.035') * 100; // % olarak
const ESCROW_FEE_PCT = parseFloat(process.env.ESCROW_FEE_RATE || '0.02') * 100;

@Injectable()
export class InstantBookingService {
  private readonly logger = new Logger(InstantBookingService.name);

  constructor(
    @InjectRepository(InstantBooking) private repo: Repository<InstantBooking>,
    private wsGateway: WebSocketGateway,
    private eventEmitter: EventEmitter2,
  ) {}

  /** Yük veren: Bu yükü anında rezervasyona aç */
  async enableInstantBooking(loadId: string, price: number) {
    const existing = await this.repo.findOne({ where: { loadId } });
    if (existing) {
      existing.instantPrice = price;
      existing.status = BookingStatus.AVAILABLE;
      existing.carrierId = null as any;
      existing.carrierName = null as any;
      return this.repo.save(existing);
    }
    return this.repo.save(this.repo.create({
      loadId,
      instantPrice: price,
      platformCommissionPct: PLATFORM_COMMISSION,
      status: BookingStatus.AVAILABLE,
    }));
  }

  /** Yük veren: Anında rezervasyonu kapat */
  async disableInstantBooking(loadId: string) {
    await this.repo.update({ loadId }, { status: BookingStatus.CANCELLED });
    return { success: true };
  }

  /** Taşıyıcı: Hemen Al — FCFS kilitleme */
  async instantBook(loadId: string, carrierId: string, carrierName: string) {
    const booking = await this.repo.findOne({ where: { loadId } });
    if (!booking || booking.status !== BookingStatus.AVAILABLE) {
      throw new ConflictException('Bu yük şu anda anında rezervasyona açık değil.');
    }

    // FCFS: İlk gelen alır — optimistic locking
    const result = await this.repo.update(
      { loadId, status: BookingStatus.AVAILABLE },
      {
        carrierId,
        carrierName,
        status: BookingStatus.LOCKED,
        lockedAt: new Date(),
        lockTimeoutMinutes: LOCK_TIMEOUT_MINUTES,
        lockAttempts: () => 'lockAttempts + 1',
        // Komisyon hesapla
        platformCommission: booking.instantPrice * (PLATFORM_COMMISSION / 100),
        escrowFee: booking.instantPrice * (ESCROW_FEE_PCT / 100),
        netCarrierEarnings: booking.instantPrice * (1 - (PLATFORM_COMMISSION + ESCROW_FEE_PCT) / 100),
      },
    );

    if (result.affected === 0) {
      throw new ConflictException('Bu yük az önce başka bir taşıyıcı tarafından rezerve edildi.');
    }

    // Güncel kaydı al
    const updated = await this.repo.findOne({ where: { loadId } });
    return updated;
  }

  /** Taşıyıcı: Kilidi onayla → kesin rezervasyon */
  async confirmBooking(loadId: string, carrierId: string) {
    const booking = await this.repo.findOne({ where: { loadId, carrierId, status: BookingStatus.LOCKED } });
    if (!booking) throw new ConflictException('Geçerli bir rezervasyon kilidi bulunamadı.');

    booking.status = BookingStatus.BOOKED;
    booking.bookedAt = new Date();
    await this.repo.save(booking);

    // Event: Yük rezerve edildi
    this.eventEmitter.emit('load.instant-booked', {
      loadId: booking.loadId,
      carrierId: booking.carrierId,
      carrierName: booking.carrierName,
      price: booking.instantPrice,
      netEarnings: booking.netCarrierEarnings,
    });

    // WebSocket bildirimi
    this.wsGateway.emitNewBid(loadId, {
      type: 'INSTANT_BOOK',
      carrierId,
      carrierName: booking.carrierName,
      price: booking.instantPrice,
    });

    return booking;
  }

  /** Taşıyıcı: Kilidi iptal et → yük tekrar AVAILABLE olur */
  async releaseLock(loadId: string, carrierId: string) {
    const booking = await this.repo.findOne({ where: { loadId, carrierId, status: BookingStatus.LOCKED } });
    if (!booking) return { success: false };
    booking.status = BookingStatus.AVAILABLE;
    booking.carrierId = null as any;
    booking.carrierName = null as any;
    booking.lockedAt = null;
    await this.repo.save(booking);
    return { success: true };
  }

  /** Yükün anında rezervasyon durumunu sorgula */
  async getStatus(loadId: string) {
    const booking = await this.repo.findOne({ where: { loadId } });
    if (!booking) return { available: false };
    return {
      available: booking.status === BookingStatus.AVAILABLE,
      locked: booking.status === BookingStatus.LOCKED,
      booked: booking.status === BookingStatus.BOOKED,
      instantPrice: booking.instantPrice,
      netEarnings: booking.instantPrice * (1 - (PLATFORM_COMMISSION + ESCROW_FEE_PCT) / 100),
      platformCommission: booking.instantPrice * (PLATFORM_COMMISSION / 100),
      escrowFee: booking.instantPrice * (ESCROW_FEE_PCT / 100),
      lockedBy: booking.carrierName,
    };
  }

  /** Tüm anında rezervasyon yüklerini listele */
  async listAvailable() {
    return this.repo.find({
      where: { status: BookingStatus.AVAILABLE },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /** Cron: Süresi dolan kilitleri temizle (her 30 saniye) */
  @Cron('*/30 * * * * *')
  async expireStaleLocks() {
    const timeout = new Date(Date.now() - LOCK_TIMEOUT_MINUTES * 60 * 1000);
    const expired = await this.repo
      .createQueryBuilder('b')
      .where('b.status = :status', { status: BookingStatus.LOCKED })
      .andWhere('b.lockedAt < :timeout', { timeout: timeout.toISOString() })
      .getMany();

    for (const b of expired) {
      b.status = BookingStatus.EXPIRED;
      b.carrierId = null as any;
      b.carrierName = null as any;
      await this.repo.save(b);
      this.logger.log(`⏰ Kilit süresi doldu: ${b.loadId}`);
    }
  }
}
