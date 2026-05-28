import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('shipment_status_history')
@Index(['shipmentId', 'createdAt'])
export class ShipmentStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  shipmentId: string;

  @Column({ length: 50 })
  fromStatus: string;

  @Column({ length: 50 })
  toStatus: string;

  @Column({ type: 'uuid', nullable: true })
  changedBy: string;

  @Column({ length: 30, default: 'system' })
  source: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
