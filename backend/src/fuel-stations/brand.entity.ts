import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  color: string;

  @Column({ default: false })
  isCustom: boolean;

  @Column('int', { default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
