// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('tracking_records')
export class TrackingRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  loadId: string;

  @Column({ nullable: true })
  driverId: string;

  @Column('float')
  latitude: number;

  @Column('float')
  longitude: number;

  @Column('float', { nullable: true })
  speed: number; // km/h

  @Column('float', { nullable: true })
  heading: number; // degrees

  @Column('float', { nullable: true })
  accuracy: number; // meters

  @Column({ nullable: true })
  label: string;

  @Column('double precision', { nullable: true })
  latitude: number;

  @Column('double precision', { nullable: true })
  longitude: number;

  @CreateDateColumn()
  timestamp: Date;
}
