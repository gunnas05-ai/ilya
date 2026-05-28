import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('marketplace_categories')
export class ListingCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  parentId: number;

  @Column({ length: 100 })
  nameTr: string;

  @Column({ length: 100 })
  nameEn: string;

  @Column({ length: 120, unique: true })
  slug: string;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ length: 50, nullable: true })
  icon: string;

  @CreateDateColumn()
  createdAt: Date;
}
