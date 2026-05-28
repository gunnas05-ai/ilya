import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { City } from './city.entity';

@Entity('districts')
export class District {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 2 })
  cityPlateCode: string;

  @ManyToOne(() => City)
  @JoinColumn({ name: 'cityPlateCode', referencedColumnName: 'plateCode' })
  city: City;

  @Column({ length: 60 })
  name: string;

  @Column({ default: false })
  isDefault: boolean;
}
