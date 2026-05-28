import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum QRCheckpointType {
  PICKUP = 'pickup',
  TRANSIT = 'transit',
  DELIVERY = 'delivery',
  MILESTONE = 'milestone',
}

@Entity('qr_codes')
export class QRCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  loadId: string;

  @Column()
  driverId: string;

  @Column()
  customerId: string;

  @Column({ type: 'simple-enum', enum: QRCheckpointType })
  checkpointType: QRCheckpointType;

  @Column({ unique: true })
  token: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date;

  @Column({ nullable: true })
  scannedByUserId: string;

  @Column('float', { nullable: true })
  scanLatitude: number;

  @Column('float', { nullable: true })
  scanLongitude: number;

  @Column({ default: false })
  gpsVerified: boolean;

  @Column({ nullable: true })
  deviceFingerprint: string;

  // ── Security fields ─────────────────────────────────────

  @Column({ nullable: true })
  hmacSignature: string;

  @Column('text', { nullable: true })
  encryptedPayload: string;

  @Column({ nullable: true })
  @Index({ unique: true })
  nonce: string;

  @Column('float', { nullable: true })
  scanAccuracy: number;

  @Column('float', { nullable: true })
  scanSpeed: number;

  @Column('int', { nullable: true })
  milestoneIndex: number;

  @CreateDateColumn()
  createdAt: Date;
}
