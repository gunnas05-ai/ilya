import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';

@Entity('warehouses')
export class Warehouse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 500 })
  address: string;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @Column({ default: 5 })
  totalDocks: number;

  @Column({ default: 0 })
  availableDocks: number;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  contactPerson: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('warehouse_appointments')
export class WarehouseAppointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  warehouseId: string;

  @Column({ type: 'uuid', nullable: true })
  loadId: string;

  @Column({ type: 'uuid', nullable: true })
  dockId: string;

  @Column({ length: 20 })
  type: string; // 'loading' | 'unloading'

  @Column({ type: 'timestamp' })
  requestedDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  assignedDate: Date;

  @Column({ length: 20, default: 'pending' })
  status: string; // 'pending', 'approved', 'rejected', 'completed', 'cancelled'

  @Column({ length: 20, nullable: true })
  plateNumber: string;

  @Column({ length: 100, nullable: true })
  driverName: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('warehouse_docks')
export class Dock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  warehouseId: string;

  @Column({ length: 20 })
  dockNumber: string;

  @Column({ length: 20 })
  type: string; // 'loading', 'unloading', 'both'

  @Column({ default: true })
  isAvailable: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
