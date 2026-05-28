import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn({ length: 60 })
  key: string;

  @Column('text', { nullable: true })
  value: string;

  @Column({ length: 200, nullable: true })
  description: string;

  @Column({ nullable: true })
  updatedBy: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
