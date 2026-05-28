import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Permission } from './permission.entity';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 40 })
  role: string;

  @Column()
  permissionId: string;

  @ManyToOne(() => Permission, { eager: true })
  @JoinColumn({ name: 'permissionId' })
  permission: Permission;

  @CreateDateColumn()
  createdAt: Date;
}
