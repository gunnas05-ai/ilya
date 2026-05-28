import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { InvoiceItem } from './invoice-item.entity';

export enum InvoiceType {
  E_FATURA = 'e_fatura',
  E_ARSIV = 'e_arsiv',
  PROFORMA = 'proforma',
  TEMEL = 'temel',
  TICARI = 'ticari',
  IRSALIYELI = 'irsaliyeli',
  E_IRSALIYE = 'e_irsaliye',
  ISTISNA = 'istisna',
  IHRACAT = 'ihracat',
  TEVKIFATLI = 'tevkifatli',
  KDV_MUAF = 'kdv_muaf',
  U_ETDS = 'u_etds',
  E_SMM = 'e_smm',
  E_MUSTAHSIL = 'e_mustahsil',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SENT = 'sent',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  companyId: string;

  @Column({ nullable: true })
  customerId: string;

  @Column({ type: 'simple-enum', enum: InvoiceType })
  invoiceType: InvoiceType;

  @Column({ length: 30 })
  @Index()
  invoiceNo: string;

  @Column({ type: 'uuid', unique: true })
  ettn: string;

  @Column({ length: 20, default: 'Temel' })
  scenario: string;

  @Column({ length: 3, default: 'TRY' })
  currency: string;

  @Column({ type: 'timestamp' })
  issueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'simple-enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  // Sender (company) info snapshot
  @Column({ type: 'text' })
  senderJson: string;

  // Receiver info snapshot
  @Column({ type: 'text' })
  receiverJson: string;

  // Financial totals
  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  discountTotal: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  vatTotal: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  withholdingTotal: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  paidAmount: number;

  // Logistics fields
  @Column({ nullable: true })
  plateNumber: string;

  @Column({ nullable: true })
  driverTcNo: string;

  @Column({ nullable: true })
  shippingAddress: string;

  @Column({ nullable: true })
  transportType: string;

  // Metadata
  @Column({ nullable: true })
  orderNo: string;

  @Column({ nullable: true })
  cancelsInvoiceId: string;

  @Column({ nullable: true })
  qrUrl: string;

  @Column({ nullable: true })
  pdfPath: string;

  @Column({ nullable: true })
  xmlPath: string;

  @Column()
  createdById: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items: InvoiceItem[];
}
