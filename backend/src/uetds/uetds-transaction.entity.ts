import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UetdsStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

@Entity('uetds_transactions')
export class UetdsTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  loadId: string;

  @Column({ nullable: true })
  referenceNo: string;

  @Column({ type: 'simple-json', nullable: true })
  payload: any;

  @Column({ type: 'simple-enum', enum: UetdsStatus, default: UetdsStatus.PENDING })
  status: UetdsStatus;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
