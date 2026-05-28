import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum SessionType {
  DRIVING = 'driving',
  REST = 'rest',
  BREAK = 'break',
  WORK = 'work',
  AVAILABLE = 'available',
}

@Entity('driver_hours')
export class DriverHours {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  driverId: string;

  @Column({ type: 'simple-enum', enum: SessionType })
  type: SessionType;

  @Column('timestamp')
  startTime: Date;

  @Column('timestamp', { nullable: true })
  endTime: Date;

  @Column('int', { default: 0 })
  durationMinutes: number;

  @Column({ nullable: true })
  vehicleId: string;

  @Column({ nullable: true })
  loadId: string;

  @Column('float', { nullable: true })
  startOdometerKm: number;

  @Column('float', { nullable: true })
  endOdometerKm: number;

  @Column({ default: false })
  isViolation: boolean;

  @Column({ nullable: true, length: 100 })
  violationType: string; // 'max_driving_exceeded', 'insufficient_rest', 'missing_break'

  @CreateDateColumn()
  createdAt: Date;
}
