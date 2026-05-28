import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('whatsapp_settings')
export class WhatsAppSettings {
  @PrimaryColumn({ default: 'default' })
  id: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ nullable: true })
  phoneNumberId: string;

  @Column({ nullable: true })
  businessAccountId: string;

  @Column({ nullable: true })
  accessToken: string;

  @Column({ nullable: true })
  webhookVerifyToken: string;

  @Column({ nullable: true })
  defaultPhoneNumber: string;

  @Column({ default: 'tr' })
  defaultLanguage: string;

  @Column({ default: true })
  sendLoadNotifications: boolean;

  @Column({ default: true })
  sendTrackingLinks: boolean;

  @Column({ default: true })
  sendPaymentConfirmations: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
