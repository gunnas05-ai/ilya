import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('company_profiles')
export class CompanyProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @OneToOne(() => User, (user) => user.companyProfile)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  companyTitle: string;

  @Column({ nullable: true })
  authorizedPerson: string;

  @Column({ nullable: true })
  taxNumber: string;

  @Column({ nullable: true })
  taxOffice: string;

  @Column({ nullable: true })
  accountantName: string;

  @Column({ nullable: true })
  accountantEmail: string;

  @Column({ nullable: true })
  accountantPhone: string;

  @Column({ nullable: true })
  businessType: string;

  @Column({ nullable: true })
  businessAddress: string;

  @Column({ nullable: true })
  companyId: string;
}
