import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { IyzicoProvider } from './providers/iyzico.provider';
import { CardInfo, CardTokenInfo } from './providers/payment-provider.interface';
import { encryptPII, decryptPII } from '../common/crypto/encryption.util';
import { MessageBusService } from '../common/message-bus.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly PLATFORM_WALLET_ID = '00000000-0000-0000-0000-000000000000';

  constructor(
    @InjectRepository(PaymentMethod)
    private paymentMethodRepo: Repository<PaymentMethod>,
    @InjectRepository(PaymentTransaction)
    private paymentTxRepo: Repository<PaymentTransaction>,
    private iyzicoProvider: IyzicoProvider,
    private messageBus: MessageBusService,
  ) {}

  /**
   * PCI-DSS uyumlu kart kaydı — backend sadece provider JS SDK'dan alınan
   * token'ı saklar, ham kart verisi (PAN/CVC) hiç backend'den geçmez.
   */
  async registerCardWithToken(
    userId: string,
    card: CardTokenInfo,
  ): Promise<PaymentMethod> {
    const existingDefault = await this.paymentMethodRepo.findOne({
      where: { userId, isDefault: true },
    });
    if (existingDefault) {
      existingDefault.isDefault = false;
      await this.paymentMethodRepo.save(existingDefault);
    }

    const method = this.paymentMethodRepo.create({
      userId,
      type: 'credit_card',
      provider: 'iyzico',
      token: encryptPII(card.cardToken),
      last4: card.last4,
      brand: card.brand || 'visa',
      cardHolderName: card.cardHolderName,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      isDefault: true,
      isActive: true,
    });

    const saved = await this.paymentMethodRepo.save(method);
    this.logger.log(`Kart tokeni kaydedildi: ${userId} — ****${card.last4} (PCI-DSS uyumlu)`);
    return saved;
  }

  /**
   * @deprecated PCI-DSS uyumsuz — ham kart verisi backend'den geçer.
   * Sadece provider entegrasyon testleri içindir. Production'da KULLANILMAZ.
   */
  async registerCard(
    userId: string,
    card: CardInfo,
  ): Promise<PaymentMethod> {
    const result = await this.iyzicoProvider.registerCard(card, userId);

    if (!result.success) {
      throw new BadRequestException(result.errorMessage || 'Kart kaydedilemedi');
    }

    const existingDefault = await this.paymentMethodRepo.findOne({
      where: { userId, isDefault: true },
    });
    if (existingDefault) {
      existingDefault.isDefault = false;
      await this.paymentMethodRepo.save(existingDefault);
    }

    const method = this.paymentMethodRepo.create({
      userId,
      type: 'credit_card',
      provider: 'iyzico',
      token: encryptPII(result.cardToken),
      last4: result.last4,
      brand: result.brand || 'visa',
      cardHolderName: result.cardHolderName,
      expiryMonth: result.expiryMonth,
      expiryYear: result.expiryYear,
      isDefault: true,
      isActive: true,
    });

    const saved = await this.paymentMethodRepo.save(method);
    this.logger.log(`Kart kaydedildi (eski API): ${userId} — ****${result.last4}`);
    return saved;
  }

  /** Kullanıcının kayıtlı kartlarını listele (son 4 hane + marka göster) */
  async listCards(userId: string): Promise<Partial<PaymentMethod>[]> {
    const methods = await this.paymentMethodRepo.find({
      where: { userId, isActive: true },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });

    return methods.map((m) => ({
      id: m.id,
      last4: m.last4,
      brand: m.brand,
      cardHolderName: m.cardHolderName,
      expiryMonth: m.expiryMonth,
      expiryYear: m.expiryYear,
      isDefault: m.isDefault,
      createdAt: m.createdAt,
      // Token ASLA dönülmez!
    }));
  }

  /** Kart sil (token'ı da sil) */
  async deleteCard(userId: string, cardId: string): Promise<void> {
    const card = await this.paymentMethodRepo.findOne({
      where: { id: cardId, userId },
    });

    if (!card) throw new NotFoundException('Kart bulunamadı');

    card.isActive = false;
    card.token = ''; // Token'ı temizle
    await this.paymentMethodRepo.save(card);
    this.logger.log(`Kart silindi: ${userId} — ****${card.last4}`);
  }

  /** Ödeme yap (kayıtlı kart ile) */
  async charge(
    userId: string,
    paymentMethodId: string,
    amount: number,       // Kuruş cinsinden
    description: string,
    type: string,
    referenceId?: string,
    referenceType?: string,
  ): Promise<PaymentTransaction> {
    // Kartı bul
    const method = await this.paymentMethodRepo.findOne({
      where: { id: paymentMethodId, userId, isActive: true },
    });
    if (!method) throw new NotFoundException('Geçerli kart bulunamadı');

    // Idempotency key (tekrarlı ödemeyi önle)
    const idempotencyKey = `pay-${userId}-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // İşlemi oluştur
    const tx = this.paymentTxRepo.create({
      userId,
      paymentMethodId,
      type,
      amount,
      currency: 'TRY',
      status: 'pending',
      idempotencyKey,
      referenceId,
      referenceType,
      metadata: { description },
    });

    await this.paymentTxRepo.save(tx);

    // Token'ı çöz
    const cardToken = decryptPII(method.token);

    // Provider'a ödeme isteği gönder
    const result = await this.iyzicoProvider.charge({
      cardToken,
      amount,
      currency: 'TRY',
      description,
      idempotencyKey,
    });

    // Sonucu kaydet
    tx.status = result.status;
    tx.providerRef = result.providerRef || '';
    if (result.errorMessage) tx.errorMessage = result.errorMessage;
    await this.paymentTxRepo.save(tx);

    if (result.success) {
      await this.messageBus.emit('payment.completed', {
        transactionId: tx.id,
        userId,
        amount,
        type,
        referenceId,
      });

      this.logger.log(`Ödeme başarılı: ${amount / 100} TL — ${description}`);
    } else {
      this.logger.warn(`Ödeme başarısız: ${amount / 100} TL — ${result.errorMessage}`);
    }

    return tx;
  }

  /** İşlem geçmişi */
  async getTransactions(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ transactions: PaymentTransaction[]; total: number }> {
    const [transactions, total] = await this.paymentTxRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { transactions, total };
  }
}
