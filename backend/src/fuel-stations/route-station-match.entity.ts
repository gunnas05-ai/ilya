import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('route_station_matches')
@Index(['routeHash', 'stationId'])
export class RouteStationMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  stationId: string;

  @Column()
  routeHash: string;

  @Column('float')
  deviationKm: number;

  @Column('float')
  distanceFromStartKm: number;

  @Column({ nullable: true })
  suggestedFuelType: string;

  @Column({ default: false })
  isRecommended: boolean;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;
}
