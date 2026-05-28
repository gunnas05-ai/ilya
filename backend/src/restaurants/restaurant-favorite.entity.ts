import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('restaurant_favorites')
export class RestaurantFavorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  restaurantId: string;

  @CreateDateColumn()
  createdAt: Date;
}
