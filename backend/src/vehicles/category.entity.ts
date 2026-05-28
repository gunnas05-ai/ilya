import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';

export type CategoryType = 'brand' | 'model' | 'year';

@Entity('vehicle_categories')
export class VehicleCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({ nullable: true })
  parentId: string;

  @ManyToOne(() => VehicleCategory, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: VehicleCategory;

  @OneToMany(() => VehicleCategory, (c) => c.parent)
  children: VehicleCategory[];

  @Column({ type: 'simple-enum', enum: ['brand', 'model'], default: 'brand' })
  type: CategoryType;

  @CreateDateColumn()
  createdAt: Date;
}
