import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('erp_integration_configs')
@Index(['companyId', 'erpType'])
export class ErpIntegrationConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ length: 30 })
  erpType: string; // 'SAP', 'ORACLE', 'NETSUITE'

  @Column({ length: 500 })
  apiEndpoint: string;

  @Column({ length: 500, nullable: true })
  authEndpoint: string;

  @Column({ type: 'jsonb' })
  fieldMappings: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  credentials: Record<string, any>;

  @Column({ length: 200, nullable: true })
  vaultPath: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 'not_configured' })
  syncStatus: string;

  @Column({ type: 'jsonb', nullable: true })
  lastSyncResult: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
