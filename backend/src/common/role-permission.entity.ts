import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Permission } from './permission.entity';
import { Role } from './role.entity';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 40 })
  role: string;

  @Column()
  permissionId: string;

  @Column({ nullable: true })
  roleId: string;

  @ManyToOne(() => Permission, { eager: true })
  @JoinColumn({ name: 'permissionId' })
  permission: Permission;

  @ManyToOne(() => Role, (r) => r.permissions, { nullable: true })
  @JoinColumn({ name: 'roleId' })
  roleEntity: Role;

  @CreateDateColumn()
  createdAt: Date;
}
