import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { District } from './district.entity';

@Entity('cities')
export class City {
  @PrimaryColumn({ length: 2 })
  plateCode: string;

  @Column({ length: 50 })
  name: string;

  @OneToMany(() => District, (d) => d.city)
  districts: District[];
}
