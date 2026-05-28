import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('credit_packages')
export class CreditPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string; // '50 Kontör', '150 Kontör', '500 Kontör'

  @Column({ type: 'int' })
  credits: number; // 50, 150, 500

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // 99.00, 249.00, 599.00

  @Column({ type: 'int', default: 0 })
  bonusCredits: number; // Ekstra hediye kontör

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
