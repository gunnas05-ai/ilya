import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 11 })
  @Index({ unique: true })
  vkn: string;

  @Column()
  name: string;

  @Column()
  taxOffice: string;

  @Column('text')
  address: string;

  @Column({ nullable: true })
  mersisNo: string;

  @Column({ nullable: true })
  sicilNo: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: false })
  profileComplete: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
