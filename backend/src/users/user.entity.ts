import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne, JoinColumn, Index } from 'typeorm';
import { Bid } from '../bids/bid.entity';
import { EscrowTransaction } from '../escrow/escrow-transaction.entity';
import { Wallet } from '../escrow/wallet.entity';

export enum UserRole {
  YUK_VEREN = 'yuk_veren',
  TASIYICI = 'tasiyici',
  SOFOR = 'sofor',
  FILO_YONETICISI = 'filo_yoneticisi',
  MUHASEBE = 'muhasebe',
  OPERASYON = 'operasyon',
  DESTEK = 'destek',
  PLATFORM_OPERATORU = 'platform_operatoru',
  MARKETPLACE_SATICI = 'marketplace_satici',
  MARKETPLACE_ALICI = 'marketplace_alici',
  DISPUTE_MODERATOR = 'dispute_moderator',
  ISLETME = 'isletme',
  GENEL = 'genel',
  GUEST = 'guest',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ length: 20, unique: true })
  phone: string;

  @Column()
  passwordHash: string;

  @Column({ length: 100 })
  fullName: string;

  @Index()
  @Column({ type: 'simple-enum', enum: UserRole, default: UserRole.YUK_VEREN })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  refreshToken: string;

  @Column({ nullable: true })
  deviceFingerprint: string;

  @Column({ nullable: true })
  companyId: string;

  // Carrier profile fields
  @Column({ nullable: true })
  licenseNumber: string;

  @Column({ nullable: true })
  plateNumber: string;

  @Column({ nullable: true })
  vehicleType: string;

  @Column({ nullable: true })
  vehicleCapacity: string;

  @Column('float', { nullable: true })
  tonnageCapacity: number;

  @Column('float', { nullable: true })
  volumeCapacity: number;

  // Kamyon olculeri
  @Column('float', { nullable: true })
  vehicleHeight: number;

  @Column('float', { nullable: true })
  vehicleWidth: number;

  @Column('float', { nullable: true })
  vehicleLength: number;

  @Column('float', { nullable: true })
  totalWeight: number;

  @Column('float', { nullable: true })
  axleWeight: number;

  @Column({ nullable: true })
  adrClass: string;

  @Column({ nullable: true })
  trailerType: string;

  @Column({ default: false })
  hasRefrigeration: boolean;

  @Column({ nullable: true })
  kBelgesi: string;

  @Column({ nullable: true })
  srcBelgesi: string;

  @Column({ nullable: true })
  tcKimlikNo: string;

  @Column({ default: false })
  isIdentityVerified: boolean;

  @Column({ default: false })
  isSrcVerified: boolean;

  @Column({ default: false })
  isKBelgesiVerified: boolean;

  @Column({ default: false })
  isPlateVerified: boolean;

  @Column({ nullable: true })
  iban: string;

  @Column({ nullable: true })
  taxNumber: string;

  // GIB e-Fatura / Accountant Info
  @Column({ nullable: true })
  accountantName: string;

  @Column({ nullable: true })
  accountantEmail: string;

  @Column({ nullable: true })
  accountantPhone: string;

  @Column({ nullable: true })
  taxOffice: string;

  @Column({ default: false })
  escrowAccountVerified: boolean;

  @Column('float', { default: 0 })
  rating: number;

  @Column({ default: 0 })
  completedLoads: number;

  // --- Company / Firma Fields ---
  @Column({ nullable: true })
  companyTitle: string;

  @Column({ nullable: true })
  authorizedPerson: string;

  // --- Business / Isletme Fields ---
  @Column({ nullable: true })
  businessType: string; // lokanta | akaryakit | kafe | motel | lastikci | servis | market | diger

  @Column({ nullable: true })
  businessAddress: string;

  // --- Driver / Tasiyici Extra Fields ---
  @Column({ nullable: true })
  licenseType: string; // A, B, C, CE...

  @Column({ nullable: true })
  srcBelgeNo: string;

  @Column({ nullable: true, type: 'date' })
  srcBelgeSonTarih: string;

  @Column({ nullable: true, type: 'date' })
  ehliyetSonTarih: string;

  // --- OTP ---
  @Column({ nullable: true, type: 'varchar' })
  otpCode: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  otpExpiresAt: Date | null;

  @Column({ default: false })
  isPhoneVerified: boolean;

  // Profile verification
  @Column({ default: 'INCOMPLETE', length: 20 })
  profileStatus: string; // INCOMPLETE, PENDING_REVIEW, VERIFIED, SUSPENDED

  @Column({ type: 'jsonb', nullable: true })
  missingFields: string[]; // Eksik alanlarin listesi

  @Column({ type: 'text', nullable: true })
  verificationNotes: string; // Red sebebi / admin notu

  @Column({ nullable: true, type: 'timestamp' })
  verifiedAt: Date;

  @Column({ default: 'pending' })
  registrationStep: string; // 'pending' | 'otp_sent' | 'completed'

  // --- EX-019: MFA / 2FA ---
  @Column({ default: false })
  mfaEnabled: boolean;

  @Column({ nullable: true, type: 'varchar' })
  totpSecret: string | null;

  @Column({ nullable: true, type: 'varchar', length: 500 })
  backupCodes: string | null; // JSON array of hashed backup codes

  @Column({ default: false })
  mfaRequiredForWallet: boolean; // Force MFA on wallet operations

  @OneToMany(() => Bid, (bid) => bid.carrier)
  bids: Bid[];

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  @JoinColumn()
  wallet: Wallet;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
