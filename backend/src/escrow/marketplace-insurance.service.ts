import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MarketplaceInsuranceService {
  private readonly logger = new Logger(MarketplaceInsuranceService.name);

  /** Sigorta fiyatı hesapla */
  async getQuote(params: { loadValue: number; distanceKm: number; vehicleType?: string; hasAdr?: boolean }) {
    const baseRate = 0.003; // %0.3
    const adrMultiplier = params.hasAdr ? 1.5 : 1.0;
    const premium = params.loadValue * baseRate * adrMultiplier;
    const minPremium = 250;

    return {
      loadValue: params.loadValue,
      distanceKm: params.distanceKm,
      premium: Math.round(Math.max(premium, minPremium)),
      coverage: params.loadValue,
      provider: 'KAPTAN Sigorta Havuzu',
      terms: 'CMR kapsamında tam koruma',
      deductedAmount: Math.round(params.loadValue * 0.02),
      packages: [
        { name: 'Temel', premium: Math.round(Math.max(premium * 0.8, minPremium)), coverage: params.loadValue * 0.8, desc: '%80 teminat' },
        { name: 'Tam', premium: Math.round(Math.max(premium, minPremium)), coverage: params.loadValue, desc: '%100 teminat' },
        { name: 'Premium', premium: Math.round(Math.max(premium * 1.3, minPremium * 1.5)), coverage: params.loadValue * 1.1, desc: '%110 genişletilmiş' },
      ],
    };
  }

  /** Sigorta poliçesi oluştur */
  async purchase(carrierId: string, loadId: string, packageName: string, loadValue: number, distanceKm: number) {
    const quote = await this.getQuote({ loadValue, distanceKm });
    const pkg = quote.packages.find(p => p.name === packageName) || quote.packages[1];
    this.logger.log(`Sigorta satın alındı: ${carrierId} → ${loadId} (${pkg.premium}₺)`);
    return {
      policyId: `POL-${Date.now()}`,
      carrierId, loadId,
      packageName: pkg.name,
      premium: pkg.premium,
      coverage: pkg.coverage,
      provider: quote.provider,
      status: 'active',
      issuedAt: new Date().toISOString(),
    };
  }
}
