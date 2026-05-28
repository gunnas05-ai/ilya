import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('customs_declarations')
@Index(['loadId'])
export class CustomsDeclaration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  loadId: string;

  @Column({ length: 30, unique: true, nullable: true })
  declarationNo: string;

  @Column({ length: 20, default: 'SUBMITTED' })
  status: string; // SUBMITTED, UNDER_REVIEW, CLEARED, REJECTED

  @Column({ length: 20 })
  customsOffice: string;

  @Column({ length: 20 })
  regime: string; // 'export', 'import', 'transit'

  @Column({ length: 50, nullable: true })
  brokerId: string;

  @Column({ length: 100, nullable: true })
  brokerName: string;

  @Column({ type: 'text', nullable: true })
  encryptedData: string; // AES-256 encrypted customs data

  @Column({ type: 'jsonb', nullable: true })
  documents: string[]; // document IDs

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'timestamp', nullable: true })
  clearedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('customs_documents')
export class CustomsDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  declarationId: string;

  @Column({ length: 20 })
  type: string; // 'cmr', 'invoice', 'packing_list', 'certificate', 'other'

  @Column({ length: 500 })
  fileUrl: string;

  @Column({ length: 200 })
  originalName: string;

  @Column({ length: 50 })
  mimeType: string;

  @Column({ type: 'int', default: 0 })
  fileSize: number;

  @CreateDateColumn()
  createdAt: Date;
}
