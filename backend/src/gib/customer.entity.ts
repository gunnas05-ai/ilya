import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column({ length: 10 })
  type: string; // 'bireysel' | 'kurumsal'

  @Column({ length: 11 })
  @Index()
  vknTckn: string;

  @Column()
  name: string;

  @Column('text')
  address: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  taxOffice: string;

  @Column({ default: false })
  isFrequent: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
