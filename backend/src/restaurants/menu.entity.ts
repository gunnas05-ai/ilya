import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Restaurant } from './restaurant.entity';
import { MenuItem } from './menu-item.entity';

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  restaurantId: string;

  @ManyToOne(() => Restaurant, (r) => r.menus)
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  @Column()
  name: string; // e.g. "Günün Menüsü", "Izgara", "Çorbalar"

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column('int', { default: 0 })
  sortOrder: number;

  @OneToMany(() => MenuItem, (i) => i.menu)
  items: MenuItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
