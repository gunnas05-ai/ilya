import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Dispute } from './dispute.entity';

export enum EvidenceType {
  PHOTO = 'photo',
  VIDEO = 'video',
  PDF = 'pdf',
  AUDIO = 'audio',
}

@Entity('dispute_evidence')
export class DisputeEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  disputeId: string;

  @ManyToOne(() => Dispute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'disputeId' })
  dispute: Dispute;

  @Column({ type: 'simple-enum', enum: EvidenceType })
  type: EvidenceType;

  @Column()
  fileUrl: string;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column('int')
  fileSize: number;

  @Column()
  uploadedByUserId: string;

  @Column('simple-json', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}
