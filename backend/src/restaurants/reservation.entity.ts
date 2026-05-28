import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('restaurant_reservations')
export class RestaurantReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  restaurantId: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  userName: string;

  @Column({ nullable: true })
  userPhone: string;

  @Column('timestamp')
  reservedAt: Date;

  @Column('simple-json', { nullable: true })
  items: { menuItemId: string; name: string; quantity: number }[];

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'simple-enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus;

  // ── Time-slot & Capacity Management ──

  @Column({ nullable: true })
  timeSlot: string; // e.g. "09:00-12:00", "12:00-17:00", "17:00-21:00"

  @Column({ default: 1, type: 'int' })
  partySize: number;

  @Column({ nullable: true })
  tableId: string; // assigned table number

  @Column({ default: 30, type: 'int' })
  estimatedDurationMinutes: number; // how long the party will stay

  @Column({ nullable: true, type: 'timestamp' })
  confirmedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  preparingAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  readyAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Time-slot capacity configuration entity.
 * Each restaurant can define max capacity per time-slot.
 */
@Entity('restaurant_tables')
export class RestaurantTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  restaurantId: string;

  @Column()
  tableNumber: string; // "Masa 1", "TIR Sofor Masasi A", etc.

  @Column({ default: 4, type: 'int' })
  capacity: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  section: string; // "ic mekan", "teras", "TIR parki yani"

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Restaurant capacity & slot configuration.
 */
@Entity('restaurant_capacity_configs')
export class RestaurantCapacityConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  restaurantId: string;

  @Column()
  timeSlot: string; // "09:00-12:00", "12:00-17:00", "17:00-21:00"

  @Column({ default: 20, type: 'int' })
  maxCapacity: number; // max number of guests per time slot

  @Column({ default: 10, type: 'int' })
  maxReservations: number; // max number of reservations per time slot

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
