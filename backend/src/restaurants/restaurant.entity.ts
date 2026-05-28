import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RestaurantImage } from './restaurant-image.entity';
import { Menu } from './menu.entity';
import { RestaurantReview } from './restaurant-review.entity';

export enum WorkingStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
}

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  city: string;

  @Column()
  district: string;

  @Column('text')
  fullAddress: string;

  @Column('float', { nullable: true })
  latitude: number;

  @Column('float', { nullable: true })
  longitude: number;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  website: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ default: false })
  hasTirParking: boolean;

  @Column('int', { default: 0 })
  parkingCapacity: number;

  @Column({ type: 'simple-enum', enum: WorkingStatus, default: WorkingStatus.ACTIVE })
  workingStatus: WorkingStatus;

  @Column({ default: false })
  is247: boolean;

  @Column('simple-json', { nullable: true })
  workingHours: { day: string; open: string; close: string }[];

  @Column('simple-json', { nullable: true })
  services: string[];

  @Column('float', { default: 0 })
  averageRating: number;

  @Column('int', { default: 0 })
  reviewCount: number;

  @Column('int', { default: 0 })
  michelinScore: number;

  @Column()
  createdById: string;

  @Column({ default: false })
  isDeleted: boolean;

  @OneToMany(() => RestaurantImage, (i) => i.restaurant)
  images: RestaurantImage[];

  @OneToMany(() => Menu, (m) => m.restaurant)
  menus: Menu[];

  @OneToMany(() => RestaurantReview, (r) => r.restaurant)
  reviews: RestaurantReview[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
