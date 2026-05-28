import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Restaurant } from './restaurant.entity';

export enum RestaurantImageType {
  DIS_MEKAN = 'dis_mekan',
  IC_MEKAN = 'ic_mekan',
  YEMEKLER = 'yemekler',
  OTOPARK = 'otopark',
  DINLENME_ALANI = 'dinlenme_alani',
}

@Entity('restaurant_images')
export class RestaurantImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  restaurantId: string;

  @ManyToOne(() => Restaurant, (r) => r.images)
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  @Column({ type: 'simple-enum', enum: RestaurantImageType })
  imageType: RestaurantImageType;

  @Column()
  url: string;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
