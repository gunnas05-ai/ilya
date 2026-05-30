import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RolePermission } from './role-permission.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 40 })
  key: string;

  @Column({ length: 100 })
  label: string;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ default: false })
  isSystem: boolean; // Sistem rolleri silinemez

  @OneToMany(() => RolePermission, (rp) => rp.roleEntity)
  permissions: RolePermission[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
