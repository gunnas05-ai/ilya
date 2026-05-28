import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';

export enum DeclarationType {
  KDV = 'kdv',
  MUHTASAR = 'muhtasar',
  GECICI_VERGI = 'gecici_vergi',
  DAMGA = 'damga',
  BA = 'ba',
  BS = 'bs',
  KURUMLAR = 'kurumlar',
}

export enum DeclarationStatus {
  DRAFT = 'draft',
  READY = 'ready',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('tax_definitions')
export class TaxDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  taxCode: string;

  @Column({ length: 100 })
  taxName: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  taxRate: number;

  @Column({ length: 30 })
  taxType: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('tax_period_summaries')
@Index(['companyId', 'year', 'month'], { unique: true })
export class TaxPeriodSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column()
  year: number;

  @Column()
  month: number;

  // KDV
  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  calculatedVat: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  deductibleVat: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  vatPayable: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  deferredVat: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  refundableVat: number;

  // Stopaj
  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  withholdingTotal: number;

  // Geçici Vergi
  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  temporaryTax: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  temporaryTaxPaid: number;

  // Damga Vergisi
  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  stampTax: number;

  // Genel Finansal
  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  revenueTotal: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  expenseTotal: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  profitTotal: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  netTaxLiability: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  governmentReceivable: number;

  @Column({ default: false })
  isLocked: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('declaration_drafts')
@Index(['companyId', 'declarationType', 'year', 'month'])
export class DeclarationDraft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column({ type: 'simple-enum', enum: DeclarationType })
  declarationType: DeclarationType;

  @Column()
  year: number;

  @Column()
  month: number;

  @Column({ type: 'simple-enum', enum: DeclarationStatus, default: DeclarationStatus.DRAFT })
  status: DeclarationStatus;

  @Column({ type: 'text' })
  draftJson: string;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  tahakkukAmount: number;

  @Column({ nullable: true, length: 50 })
  tahakkukNo: string;

  @Column({ nullable: true })
  submissionDate: Date;

  @Column({ nullable: true })
  gibStatus: string;

  @Column({ nullable: true })
  gibErrorMessage: string;

  @Column({ default: 0 })
  retryCount: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ length: 50 })
  actionType: string;

  @Column({ type: 'text', nullable: true })
  oldValue: string;

  @Column({ type: 'text', nullable: true })
  newValue: string;

  @Column({ nullable: true, length: 50 })
  ipAddress: string;

  @CreateDateColumn()
  timestamp: Date;
}

/** F.1 — WITHHOLDING_DEFINITIONS: Dinamik tevkifat kuralları */
@Entity('withholding_definitions')
export class WithholdingDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20, unique: true })
  withholdingCode: string;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  withholdingRate: number;

  @Column({ length: 30 })
  withholdingType: string;

  @Column({ length: 10, nullable: true })
  serviceCode: string;

  @Column({ length: 100 })
  label: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string;

  @CreateDateColumn()
  createdAt: Date;
}

/** F.1 — E_DOCUMENT_LOGS: GIB belge gönderim logu */
@Entity('e_document_logs')
@Index(['documentType', 'gibStatus'])
export class EDocumentLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column({ length: 30 })
  documentType: string;

  @Column({ length: 50 })
  documentUuid: string;

  @Column({ length: 20, default: 'PENDING' })
  gibStatus: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ nullable: true })
  lastAttemptAt: Date;

  @Column({ nullable: true })
  successAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
