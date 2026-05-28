import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('delivery_signatures')
export class DeliverySignature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  loadId: string;

  @Column()
  driverId: string;

  @Column('text')
  signatureImageBase64: string; // Stored as base64 or S3 URL

  @Column({ type: 'simple-json', nullable: true })
  vectorPath: any; // Used for fraud detection/replay attacks

  @Column()
  signerName: string;

  @Column({ nullable: true })
  signerRole: string; // e.g., 'Receiver', 'Warehouse Manager'

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  deviceId: string;

  @Column('float', { nullable: true })
  latitude: number;

  @Column('float', { nullable: true })
  longitude: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
