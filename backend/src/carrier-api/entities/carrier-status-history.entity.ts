import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('carrier_status_history')
@Index(['loadId', 'createdAt'])
export class CarrierStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  loadId: string;

  @Column({ type: 'uuid' })
  carrierId: string;

  @Column({ length: 50 })
  fromState: string;

  @Column({ length: 50 })
  toState: string;

  @Column({ type: 'float', nullable: true })
  latitude: number;

  @Column({ type: 'float', nullable: true })
  longitude: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
