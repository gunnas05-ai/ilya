import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('saved_station_filters')
@Index(['userId', 'listOrder'])
export class SavedStationFilter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true })
  fuelType: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  district: string;

  @Column('simple-json', { nullable: true })
  serviceTypes: string[];

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  minPrice: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  maxPrice: number;

  @Column('float', { nullable: true })
  maxDistance: number;

  @Column('float', { nullable: true })
  minRating: number;

  @Column({ nullable: true })
  is247: boolean;

  @Column({ nullable: true })
  hasCharging: boolean;

  @Column({ nullable: true })
  isOpen: boolean;

  @Column({ length: 20, nullable: true })
  sortBy: string;

  @Column({ length: 4, nullable: true })
  sortDirection: 'ASC' | 'DESC';

  @Column('int', { default: 0 })
  listOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
