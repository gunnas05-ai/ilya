import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('driver_feed_posts')
export class DriverFeedPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  authorId: string;

  @Column({ length: 60 })
  authorName: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column('float', { nullable: true })
  latitude: number;

  @Column('float', { nullable: true })
  longitude: number;

  @Column({ length: 60, nullable: true })
  locationName: string;

  @Column({ default: 0 })
  helpfulCount: number;

  @Column({ default: 0 })
  commentCount: number;

  @Column('simple-array', { default: '' })
  helpfulUserIds: string[];

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('driver_feed_comments')
export class DriverFeedComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  postId: string;

  @Column()
  authorId: string;

  @Column({ length: 60 })
  authorName: string;

  @Column('text')
  content: string;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('road_reports')
export class RoadReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'anonymous' })
  reporterId: string; // 'anonymous' for privacy

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @Column({ length: 60 })
  roadName: string;

  @Column({ length: 20 })
  reportType: string; // 'trafik', 'kaza', 'yol_calismasi', 'buzlanma', 'sel', 'polis_kontrol', 'diger'

  @Column('text')
  description: string;

  @Column({ type: 'timestamp' })
  validUntil: Date; // Auto-expire after 4 hours

  @Column({ default: 0 })
  confirmCount: number;

  @Column({ default: false })
  isExpired: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
