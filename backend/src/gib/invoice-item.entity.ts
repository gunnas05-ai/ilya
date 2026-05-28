import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Invoice } from './invoice.entity';

@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  invoiceId: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.items)
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column()
  lineNo: number;

  @Column({ length: 50, nullable: true })
  productCode: string;

  @Column('text')
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  quantity: number;

  @Column({ length: 10 })
  unit: string;

  @Column({ type: 'decimal', precision: 19, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPct: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  vatRate: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  withholdingRate: number;

  @Column({ type: 'decimal', precision: 19, scale: 2, default: 0 })
  withholdingAmount: number;

  @Column({ type: 'decimal', precision: 19, scale: 2 })
  lineTotal: number;
}
