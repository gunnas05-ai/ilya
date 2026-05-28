import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Menu } from './menu.entity';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  menuId: string;

  @ManyToOne(() => Menu, (m) => m.items)
  @JoinColumn({ name: 'menuId' })
  menu: Menu;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  portionDescription: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDailyMenu: boolean;

  @Column({ default: false })
  hasTirDiscount: boolean;

  @Column({ default: false })
  isPopular: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
