import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Invoice } from './invoice.entity';

@Entity('invoice_logs')
export class InvoiceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  invoiceId: string;

  @Column({ length: 50 })
  action: string;

  @Column('text', { nullable: true })
  detail: string;

  @Column()
  performedById: string;

  @CreateDateColumn()
  createdAt: Date;
}
