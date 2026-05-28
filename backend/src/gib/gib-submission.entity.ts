import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('gib_submissions')
export class GibSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  invoiceId: string;

  @Column('text', { nullable: true })
  requestPayload: string;

  @Column({ nullable: true })
  responseCode: string;

  @Column('text', { nullable: true })
  responseBody: string;

  @Column({ default: false })
  success: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
