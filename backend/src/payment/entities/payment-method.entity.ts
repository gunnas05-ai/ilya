import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('payment_methods')
@Index(['userId', 'isDefault'])
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ length: 20 })
  type: string; // 'credit_card', 'debit_card'

  @Column({ length: 20 })
  provider: string; // 'iyzico', 'stripe'

  @Column({ length: 500 })
  token: string; // AES-256 encrypted card token

  @Column({ length: 4 })
  last4: string; // Son 4 hane (gösterim için)

  @Column({ length: 20 })
  brand: string; // 'visa', 'mastercard', 'troy', 'amex'

  @Column({ length: 200 })
  cardHolderName: string;

  @Column({ length: 2 })
  expiryMonth: string; // '12'

  @Column({ length: 4 })
  expiryYear: string; // '2028'

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
