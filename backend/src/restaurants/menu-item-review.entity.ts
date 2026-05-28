import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('menu_item_reviews')
export class MenuItemReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  menuItemId: string;

  @Column()
  userId: string;

  @Column('int')
  rating: number;

  @Column('text', { nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;
}
