import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { PaymentService } from '../payment/payment.service';
import { MessageBusService } from '../common/message-bus.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(SubscriptionPlan) private planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(UserSubscription) private subRepo: Repository<UserSubscription>,
    private paymentService: PaymentService,
    private messageBus: MessageBusService,
  ) {}

  /** Tüm aktif paketleri listele */
  async getPlans(): Promise<SubscriptionPlan[]> {
    return this.planRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /** Paket satın al */
  async purchase(userId: string, planId: string, paymentMethodId: string): Promise<UserSubscription> {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Paket bulunamadi');

    // Mevcut aktif aboneliği iptal et
    const existing = await this.subRepo.findOne({
      where: { userId, status: 'active' },
    });
    if (existing) {
      existing.status = 'cancelled';
      existing.cancelledAt = new Date();
      await this.subRepo.save(existing);
    }

    // Ödeme al
    const tx = await this.paymentService.charge(
      userId, paymentMethodId, Math.round(plan.monthlyPrice * 100),
      `${plan.displayName} Aylik Abonelik`, 'subscription', planId, 'subscription',
    );

    if (tx.status !== 'success') {
      throw new ForbiddenException('Odeme basarisiz: ' + (tx.errorMessage || 'Bilinmeyen hata'));
    }

    // Aboneliği oluştur
    const now = new Date();
    const sub = this.subRepo.create({
      userId,
      planId,
      status: 'active',
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 86400000), // +30 gün
      paymentMethodId,
      autoRenew: true,
    });

    const saved = await this.subRepo.save(sub);
    await this.messageBus.emit('subscription.purchased', { userId, planId, planName: plan.displayName });

    this.logger.log(`Abonelik: ${userId} → ${plan.displayName} (${plan.monthlyPrice} TL/ay)`);
    return saved;
  }

  /** Kullanıcının aktif aboneliği */
  async getActiveSubscription(userId: string): Promise<UserSubscription | null> {
    return this.subRepo.findOne({
      where: { userId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }

  /** Kullanıcının yük ekleme hakkı var mı? */
  async canCreateLoad(userId: string): Promise<boolean> {
    const sub = await this.getActiveSubscription(userId);
    if (!sub) return false;

    const plan = await this.planRepo.findOne({ where: { id: sub.planId } });
    if (!plan) return false;

    if (plan.maxLoads === -1) return true; // limitsiz

    // Bu ay oluşturulan yük sayısını say (loads servisinden)
    // Basitleştirilmiş: abonelik varsa izin ver
    return true;
  }

  /** API erişim kontrolü */
  async canAccessApi(userId: string, feature: string): Promise<boolean> {
    const sub = await this.getActiveSubscription(userId);
    if (!sub) return false;

    const plan = await this.planRepo.findOne({ where: { id: sub.planId } });
    if (!plan?.features) return false;

    return plan.features[feature] === true;
  }

  /** Plan güncelle (Admin) */
  async updatePlan(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan bulunamadi');
    Object.assign(plan, data);
    const saved = await this.planRepo.save(plan);
    this.logger.log(`Plan güncellendi: ${plan.displayName}`);
    return saved;
  }

  /** Aboneliği iptal et (dönem sonunda) */
  async cancelSubscription(userId: string): Promise<void> {
    const sub = await this.getActiveSubscription(userId);
    if (!sub) throw new NotFoundException('Aktif abonelik bulunamadi');

    sub.autoRenew = false;
    sub.cancelledAt = new Date();
    await this.subRepo.save(sub);

    this.logger.log(`Abonelik iptal edildi: ${userId}`);
  }

  /** Otomatik yenileme (cron: her gün 03:00) */
  @Cron('0 3 * * *')
  async processRenewals(): Promise<void> {
    const now = new Date();
    const expiringSoon = new Date(now.getTime() + 24 * 3600000); // 24 saat içinde bitecekler

    const toRenew = await this.subRepo.find({
      where: {
        status: 'active',
        autoRenew: true,
        currentPeriodEnd: LessThan(expiringSoon),
      },
    });

    for (const sub of toRenew) {
      try {
        const plan = await this.planRepo.findOne({ where: { id: sub.planId } });
        if (!plan || !sub.paymentMethodId) continue;

        // Ödeme dene
        const tx = await this.paymentService.charge(
          sub.userId, sub.paymentMethodId,
          Math.round(plan.monthlyPrice * 100),
          `${plan.displayName} Otomatik Yenileme`, 'subscription', sub.id, 'subscription',
        );

        if (tx.status === 'success') {
          // Başarılı → dönemi uzat
          sub.currentPeriodStart = new Date();
          sub.currentPeriodEnd = new Date(Date.now() + 30 * 86400000);
          sub.renewalFailCount = 0;
          sub.lastRenewalAttempt = new Date();
          await this.subRepo.save(sub);
          this.logger.log(`Yenileme başarılı: ${sub.userId} — ${plan.displayName}`);
        } else {
          // Başarısız → retry say
          sub.renewalFailCount += 1;
          sub.lastRenewalAttempt = new Date();

          if (sub.renewalFailCount >= 3) {
            // 3 başarısız deneme → grace period
            sub.status = 'grace_period';
            await this.messageBus.emit('subscription.payment_failed', {
              userId: sub.userId, planId: sub.planId, failCount: sub.renewalFailCount,
            });
          }

          await this.subRepo.save(sub);
          this.logger.warn(`Yenileme başarısız: ${sub.userId} (${sub.renewalFailCount}/3)`);
        }
      } catch (err) {
        this.logger.error(`Yenileme hatası: ${sub.userId}`, err instanceof Error ? err.message : undefined);
      }
    }

    // Süresi geçmiş grace period'ları expired yap
    const expired = await this.subRepo.find({
      where: { status: 'grace_period', currentPeriodEnd: LessThan(now) },
    });
    for (const sub of expired) {
      sub.status = 'expired';
      await this.subRepo.save(sub);
    }

    if (toRenew.length > 0) {
      this.logger.log(`Abonelik yenileme tamamlandı: ${toRenew.length} kontrol edildi`);
    }
  }
}
