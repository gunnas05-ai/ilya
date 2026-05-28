import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('delivery_photos')
export class DeliveryPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  loadId: string;

  @Column()
  driverId: string;

  @Column('text')
  photoUrl: string; // S3 or local path

  @Column('float', { nullable: true })
  latitude: number;

  @Column('float', { nullable: true })
  longitude: number;

  @CreateDateColumn()
  createdAt: Date;
}
