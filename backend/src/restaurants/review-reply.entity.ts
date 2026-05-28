import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { RestaurantReview } from './restaurant-review.entity';

@Entity('review_replies')
export class ReviewReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reviewId: string;

  @ManyToOne(() => RestaurantReview, (r) => r.replies)
  @JoinColumn({ name: 'reviewId' })
  review: RestaurantReview;

  @Column()
  userId: string;

  @Column('text')
  message: string;

  @CreateDateColumn()
  createdAt: Date;
}
