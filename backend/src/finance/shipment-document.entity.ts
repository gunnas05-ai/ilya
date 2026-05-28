import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum DocumentType {
  CMR = 'cmr',
  INVOICE = 'invoice',
  INSURANCE = 'insurance',
  WEIGHT_TICKET = 'weight_ticket',
  DELIVERY_NOTE = 'delivery_note',
  CUSTOMS = 'customs',
  ADR = 'adr',
  OTHER = 'other',
}

export enum DocumentStatus {
  UPLOADED = 'uploaded',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  MISSING = 'missing',
}

@Entity('shipment_documents')
@Index(['shipmentId'])
@Index(['carrierId'])
export class ShipmentDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  shipmentId: string;

  @Column({ type: 'uuid', nullable: true })
  carrierId: string;

  @Column({ type: 'simple-enum', enum: DocumentType })
  type: DocumentType;

  @Column()
  name: string;

  @Column({ nullable: true })
  fileUrl: string;

  @Column('simple-json', { nullable: true })
  ocrData: any; // OCR'den çekilen veriler

  @Column({ type: 'simple-enum', enum: DocumentStatus, default: DocumentStatus.UPLOADED })
  status: DocumentStatus;

  @Column({ nullable: true })
  verifiedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ default: false })
  isRequired: boolean;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
