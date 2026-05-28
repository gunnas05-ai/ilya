import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 64, unique: true })
  keyHash: string; // SHA-256 hash

  @Column({ length: 12 })
  keyPrefix: string; // First 8 chars for display (e.g. "kpt_abc12...")

  @Column('simple-array', { nullable: true })
  permissions: string[]; // ['loads:read', 'loads:create', 'tracking:read', ...]

  @Column({ default: 1000 })
  rateLimitPerHour: number;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
