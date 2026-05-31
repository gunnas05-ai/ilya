import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('mfa_settings')
export class MfaSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @OneToOne(() => User, (user) => user.mfaSettings)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: false })
  mfaEnabled: boolean;

  @Column({ nullable: true, type: 'varchar' })
  totpSecret: string | null;

  @Column({ nullable: true, type: 'varchar', length: 500 })
  backupCodes: string | null;

  @Column({ default: false })
  mfaRequiredForWallet: boolean;

  @Column({ default: false })
  escrowAccountVerified: boolean;
}
