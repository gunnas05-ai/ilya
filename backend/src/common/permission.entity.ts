import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 80 })
  key: string;

  @Column({ length: 150 })
  label: string;

  @Column({ length: 50 })
  group: string;

  @CreateDateColumn()
  createdAt: Date;
}
