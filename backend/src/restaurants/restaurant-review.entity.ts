import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Restaurant } from './restaurant.entity';
import { ReviewReply } from './review-reply.entity';

@Entity('restaurant_reviews')
export class RestaurantReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  restaurantId: string;

  @ManyToOne(() => Restaurant, (r) => r.reviews)
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  @Column()
  userId: string;

  @Column('int')
  rating: number;

  @Column('text')
  comment: string;

  @Column({ nullable: true })
  menuItemId: string;

  @Column({ default: false })
  isDeleted: boolean;

  @Column('int', { default: 0 })
  helpfulCount: number;

  @OneToMany(() => ReviewReply, (r) => r.review)
  replies: ReviewReply[];

  @CreateDateColumn()
  createdAt: Date;
}
