import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FuelCard, FuelCardTransaction, FuelCardProvider } from './fuel-card.entity';
import { Expense } from '../finance/expense.entity';

@Injectable()
export class FuelCardService {
  private readonly logger = new Logger(FuelCardService.name);

  constructor(
    @InjectRepository(FuelCard)
    private cardRepo: Repository<FuelCard>,
    @InjectRepository(FuelCardTransaction)
    private txRepo: Repository<FuelCardTransaction>,
    @InjectRepository(Expense)
    private expenseRepo: Repository<Expense>,
  ) {}

  async registerCard(data: { userId: string; cardNo: string; provider: FuelCardProvider; holderName: string; monthlyLimit?: number; vehiclePlate?: string }) {
    const existing = await this.cardRepo.findOne({ where: { cardNo: data.cardNo } });
    if (existing) throw new BadRequestException('Bu kart zaten kayıtlı');

    const card = this.cardRepo.create(data);
    return this.cardRepo.save(card);
  }

  async getMyCards(userId: string) {
    return this.cardRepo.find({ where: { userId, isActive: true } });
  }

  async getCardTransactions(cardId: string, userId: string) {
    return this.txRepo.find({ where: { cardId, userId }, order: { transactionDate: 'DESC' }, take: 50 });
  }

  /** Process incoming fuel card transaction (webhook from provider) */
  async processTransaction(data: {
    cardNo: string;
    amount: number;
    liters: number;
    pricePerLiter: number;
    fuelType: string;
    stationName: string;
    stationCity?: string;
    transactionDate: string;
    providerTransactionId: string;
  }) {
    const card = await this.cardRepo.findOne({ where: { cardNo: data.cardNo, isActive: true } });
    if (!card) throw new BadRequestException('Kart bulunamadı veya pasif');

    // Duplicate check
    const dup = await this.txRepo.findOne({ where: { providerTransactionId: data.providerTransactionId } });
    if (dup) return { duplicate: true, existingId: dup.id };

    const tx = this.txRepo.create({
      cardId: card.id,
      userId: card.userId,
      amount: data.amount,
      liters: data.liters,
      pricePerLiter: data.pricePerLiter,
      fuelType: data.fuelType,
      stationName: data.stationName,
      stationCity: data.stationCity,
      transactionDate: new Date(data.transactionDate),
      providerTransactionId: data.providerTransactionId,
    });
    const saved = await this.txRepo.save(tx);

    // Auto-create expense record
    try {
      const expense = this.expenseRepo.create({
        userId: card.userId,
        amount: data.amount,
        date: new Date(data.transactionDate),
        categoryId: 'fuel',
      } as any);
      const result = await this.expenseRepo.save(expense);
      const savedExpense: any = Array.isArray(result) ? result[0] : result;

      saved.syncedToFinance = true;
      saved.expenseId = savedExpense?.id || null;
      await this.txRepo.save(saved);
    } catch (err) {
      this.logger.warn(`Expense sync failed for fuel tx ${saved.id}: ${err.message}`);
    }

    // Update monthly spent
    card.currentMonthSpent += data.amount;
    if (card.monthlyLimit > 0 && card.currentMonthSpent >= card.monthlyLimit * 0.8) {
      this.logger.log(`Fuel card ${card.cardNo} at ${Math.round(card.currentMonthSpent / card.monthlyLimit * 100)}% of monthly limit`);
    }
    await this.cardRepo.save(card);

    return saved;
  }

  /** Webhook receiver for fuel card providers */
  async handleProviderWebhook(provider: string, payload: any) {
    this.logger.log(`Fuel card webhook from ${provider}`);
    return this.processTransaction({
      cardNo: payload.cardNo || payload.card_number,
      amount: parseFloat(payload.amount || payload.total_amount),
      liters: parseFloat(payload.liters || payload.volume),
      pricePerLiter: parseFloat(payload.pricePerLiter || payload.unit_price),
      fuelType: payload.fuelType || payload.fuel_type || 'motorin',
      stationName: payload.stationName || payload.station_name || 'Bilinmeyen İstasyon',
      stationCity: payload.stationCity || payload.station_city,
      transactionDate: payload.transactionDate || payload.transaction_date || new Date().toISOString(),
      providerTransactionId: payload.providerTransactionId || payload.transaction_id || `AUTO-${Date.now()}`,
    });
  }
}
