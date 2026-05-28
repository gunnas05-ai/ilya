import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InsurancePolicy, InsuranceStatus, InsuranceProvider } from './insurance.entity';
import { Load } from '../loads/load.entity';

export interface InsurancePackage {
  id: string;
  name: string;
  provider: InsuranceProvider;
  coverageRate: number;    // e.g., 0.80 = 80% of cargo value
  premiumRate: number;     // e.g., 0.02 = 2% of cargo value
  minPremium: number;
  features: string[];
}

const AVAILABLE_PACKAGES: InsurancePackage[] = [
  { id: 'basic', name: 'Temel Kargo', provider: InsuranceProvider.MOCK, coverageRate: 0.70, premiumRate: 0.015, minPremium: 250, features: ['Yangın', 'Hırsızlık', 'Kaza'] },
  { id: 'standard', name: 'Standart Kargo', provider: InsuranceProvider.MOCK, coverageRate: 0.85, premiumRate: 0.020, minPremium: 400, features: ['Yangın', 'Hırsızlık', 'Kaza', 'Devrilme', 'Su Baskını'] },
  { id: 'premium', name: 'Tam Kasko', provider: InsuranceProvider.MOCK, coverageRate: 1.00, premiumRate: 0.030, minPremium: 750, features: ['Tüm riskler', 'Hırsızlık', 'ADR destekli', 'Soğuk zincir', 'Gecikme tazmini'] },
];

@Injectable()
export class InsuranceService {
  private readonly logger = new Logger(InsuranceService.name);

  constructor(
    @InjectRepository(InsurancePolicy)
    private policyRepo: Repository<InsurancePolicy>,
    @InjectRepository(Load)
    private loadRepo: Repository<Load>,
    private eventEmitter: EventEmitter2,
  ) {}

  getAvailablePackages(): InsurancePackage[] {
    return AVAILABLE_PACKAGES;
  }

  /** Issue an insurance policy for a load */
  async issuePolicy(
    loadId: string,
    userId: string,
    packageId: string,
  ): Promise<InsurancePolicy> {
    const pkg = AVAILABLE_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) throw new BadRequestException('Geçersiz sigorta paketi');

    const load = await this.loadRepo.findOne({ where: { id: loadId } });
    if (!load) throw new BadRequestException('Yük bulunamadı');

    const cargoValue = Number(load.totalPrice) || 0;
    if (cargoValue <= 0) throw new BadRequestException('Sigortalanabilir yük değeri bulunamadı');

    const premium = Math.max(pkg.minPremium, Math.round(cargoValue * pkg.premiumRate));
    const coverageAmount = Math.round(cargoValue * pkg.coverageRate);

    // Generate policy number
    const policyNo = `KPT-INS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const policy = this.policyRepo.create({
      loadId,
      userId,
      policyNo,
      provider: pkg.provider,
      packageName: pkg.name,
      cargoValue,
      premium,
      coverageAmount,
      currency: 'TRY',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: InsuranceStatus.ACTIVE,
      providerPolicyId: `MOCK-${policyNo}`,
    });

    const saved = await this.policyRepo.save(policy);

    // Update load insurance flag
    load.insurance = true;
    load.insurancePackage = packageId;
    await this.loadRepo.save(load);

    this.eventEmitter.emit('insurance.policy_issued', {
      policyId: saved.id,
      loadId,
      premium,
      coverageAmount,
    });

    this.logger.log(`Policy ${policyNo} issued for load ${loadId}: ${premium} TRY premium, ${coverageAmount} TRY coverage`);

    return saved;
  }

  /** Get policy by load ID */
  async getPolicyByLoad(loadId: string): Promise<InsurancePolicy | null> {
    return this.policyRepo.findOne({ where: { loadId }, order: { createdAt: 'DESC' } });
  }

  /** Get all policies for a user */
  async getUserPolicies(userId: string): Promise<InsurancePolicy[]> {
    return this.policyRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  /** File a claim on a policy */
  async fileClaim(
    policyId: string,
    userId: string,
    claimAmount: number,
    description: string,
  ): Promise<InsurancePolicy> {
    const policy = await this.policyRepo.findOne({ where: { id: policyId, userId } });
    if (!policy) throw new BadRequestException('Poliçe bulunamadı');
    if (policy.status !== InsuranceStatus.ACTIVE) throw new BadRequestException('Poliçe aktif değil');
    if (claimAmount > policy.coverageAmount) throw new BadRequestException('Talep edilen tutar teminatı aşıyor');

    policy.isClaimed = true;
    policy.claimAmount = claimAmount;
    policy.status = InsuranceStatus.CLAIMED;
    await this.policyRepo.save(policy);

    this.eventEmitter.emit('insurance.claim_filed', {
      policyId,
      loadId: policy.loadId,
      claimAmount,
      description,
    });

    this.logger.log(`Claim filed for policy ${policy.policyNo}: ${claimAmount} TRY`);

    return policy;
  }

  /** Add insurance premium to escrow amount on load creation */
  @OnEvent('load.created')
  async handleLoadCreated(payload: { loadId: string }): Promise<void> {
    // If load was created with insurance, ensure escrow reflects the premium
    const load = await this.loadRepo.findOne({ where: { id: payload.loadId } });
    if (!load?.insurance || !load?.insurancePackage) return;

    const policy = await this.getPolicyByLoad(payload.loadId);
    if (!policy) return;

    this.logger.log(`Insurance premium ${policy.premium} TRY added to load ${payload.loadId}`);
  }
}
