import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum StationAuditAction {
  STATION_CREATED = 'station_created',
  STATION_UPDATED = 'station_updated',
  STATION_DELETED = 'station_deleted',
  PRICE_UPDATED = 'price_updated',
  PRICE_CONFIRMED = 'price_confirmed',
  PRICE_FLAGGED = 'price_flagged',
  PRICE_REPORTED = 'price_reported',
  IMAGE_UPLOADED = 'image_uploaded',
  REVIEW_ADDED = 'review_added',
  ALERT_TRIGGERED = 'alert_triggered',
  ALERT_CREATED = 'alert_created',
  FAVORITE_ADDED = 'favorite_added',
}

@Entity('fuel_station_audit_logs')
@Index(['stationId', 'createdAt'])
@Index(['action', 'createdAt'])
export class StationAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'simple-enum', enum: StationAuditAction })
  action: StationAuditAction;

  @Column({ nullable: true })
  stationId: string;

  @Column()
  userId: string;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
