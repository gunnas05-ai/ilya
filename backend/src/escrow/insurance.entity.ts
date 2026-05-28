import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum InsuranceStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  CLAIMED = 'claimed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum InsuranceProvider {
  MOCK = 'mock',
  ANADOLU_SIGORTA = 'anadolu_sigorta',
  ALLIANZ = 'allianz',
  RAY_SIGORTA = 'ray_sigorta',
}

@Entity('insurance_policies')
export class InsurancePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  loadId: string;

  @Column()
  @Index()
  userId: string;

  @Column({ length: 30, unique: true })
  policyNo: string;

  @Column({ type: 'simple-enum', enum: InsuranceProvider, default: InsuranceProvider.MOCK })
  provider: InsuranceProvider;

  @Column({ length: 60 })
  packageName: string;

  @Column('float')
  cargoValue: number;

  @Column('float')
  premium: number;

  @Column('float')
  coverageAmount: number;

  @Column({ length: 3, default: 'TRY' })
  currency: string;

  @Column('timestamp')
  startDate: Date;

  @Column('timestamp')
  endDate: Date;

  @Column({ type: 'simple-enum', enum: InsuranceStatus, default: InsuranceStatus.PENDING })
  status: InsuranceStatus;

  @Column({ nullable: true, length: 100 })
  providerPolicyId: string;

  @Column({ default: false })
  isClaimed: boolean;

  @Column('float', { default: 0 })
  claimAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}
