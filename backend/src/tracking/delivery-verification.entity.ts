import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('delivery_verifications')
export class DeliveryVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  loadId: string;

  @Column()
  driverId: string;

  @Column({ type: 'simple-enum', enum: ['qr', 'photo', 'otp', 'gps'] })
  method: 'qr' | 'photo' | 'otp' | 'gps';

  @Column('simple-json', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  verifiedAt: Date;
}
