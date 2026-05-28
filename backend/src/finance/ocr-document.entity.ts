import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum OcrDocumentStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
  USER_APPROVED = 'user_approved',
}

export enum OcrDocumentType {
  RECEIPT = 'receipt',
  RATE_CONFIRMATION = 'rate_confirmation',
  DRIVER_LICENSE = 'driver_license',
  SRC_DOCUMENT = 'src_document',
}

/** EX-017: Typed OCR result per document type */
export interface ReceiptOcrData {
  rawText: string;
  amount: number | null;
  date: string;
  taxNo: string | null;
  vendorName: string | null;
}

export interface RateConfirmationOcrData {
  rawText: string;
  price: number | null;
  fromCity: string | null;
  toCity: string | null;
  shipperName: string | null;
  carrierName: string | null;
  loadNo: string | null;
}

export interface DriverLicenseOcrData {
  rawText: string;
  tcKimlikNo: string | null;
  licenseNo: string | null;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  expiryDate: string | null;
  bloodType: string | null;
}

export interface SrcDocumentOcrData {
  rawText: string;
  srcNo: string | null;
  holderName: string | null;
  expiryDate: string | null;
  category: string | null;
}

@Entity('ocr_documents')
export class OcrDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  fileUrl: string;

  @Column({ length: 50 })
  mimeType: string;

  @Column({ type: 'simple-enum', enum: OcrDocumentType, default: OcrDocumentType.RECEIPT })
  documentType: OcrDocumentType;

  @Column({ nullable: true })
  userId: string;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  confidenceScore: number;

  @Column('simple-json', { nullable: true })
  parsedData: any;

  @Column({ type: 'simple-enum', enum: OcrDocumentStatus, default: OcrDocumentStatus.PENDING })
  status: OcrDocumentStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
