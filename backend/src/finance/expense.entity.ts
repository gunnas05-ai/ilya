import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { ExpenseCategory } from './expense-category.entity';
import { OcrDocument } from './ocr-document.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  categoryId: string;

  @ManyToOne(() => ExpenseCategory)
  @JoinColumn({ name: 'categoryId' })
  category: ExpenseCategory;

  @Column({ nullable: true })
  vehicleId: string;

  @Column({ nullable: true })
  ocrDocumentId: string;

  @ManyToOne(() => OcrDocument, { nullable: true })
  @JoinColumn({ name: 'ocrDocumentId' })
  ocrDocument: OcrDocument;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'TRY' })
  currency: string;

  @Column('timestamp')
  date: Date;

  @Column({ nullable: true })
  taxStatus: boolean;

  @Column({ length: 50, nullable: true })
  paymentMethod: string;

  @Column({ type: 'simple-json', nullable: true })
  location: any;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
