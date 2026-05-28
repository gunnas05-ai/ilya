import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('vehicle_positions', { synchronize: true })
@Index(['shipmentId', 'timestamp'])
export class VehiclePosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  shipmentId: string;

  @Column({ type: 'uuid', nullable: true })
  driverId: string;

  /**
   * PostGIS GEOGRAPHY(POINT) sütunu.
   * TypeORM geometry tipiyle map'lenir.
   * Örnek deger: { type: 'Point', coordinates: [lng, lat] }
   */
  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  position: { type: string; coordinates: number[] };

  @Column({ type: 'float', nullable: true })
  speed: number; // km/h

  @Column({ type: 'float', nullable: true })
  heading: number; // degrees

  @Column({ type: 'float', nullable: true })
  accuracy: number; // meters

  @Column({ type: 'varchar', length: 50, nullable: true })
  label: string;

  @CreateDateColumn()
  @Index()
  timestamp: Date;
}
