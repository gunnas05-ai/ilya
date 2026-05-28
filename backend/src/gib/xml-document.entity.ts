import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('xml_documents')
export class XmlDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  invoiceId: string;

  @Column('text', { nullable: true })
  xmlContent: string;

  @Column({ default: false })
  xsdValid: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
