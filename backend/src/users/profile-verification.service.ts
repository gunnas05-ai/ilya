import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { REQUIRED_CARRIER_FIELDS, REQUIRED_FIELD_LABELS } from './users.service';

export interface ProfileStatusResponse {
  status: string;
  missingFields: string[];
  verificationNotes: string | null;
  verifiedAt: Date | null;
  completionPercent: number;
  canAccessLoads: boolean;
}

@Injectable()
export class ProfileVerificationService {
  private readonly logger = new Logger(ProfileVerificationService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private wsGateway: WebSocketGateway,
  ) {}

  async getProfileStatus(userId: string): Promise<ProfileStatusResponse> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const missing = checkMissingFields(user);
    const completionPercent = Math.round(((REQUIRED_CARRIER_FIELDS.length - missing.length) / REQUIRED_CARRIER_FIELDS.length) * 100);

    // Admin onayi zorunlu — otomatik VERIFIED YOK (PENDING_REVIEW bekler)
    // Sadece daha once VERIFIED olan kullanicilarin durumunu koru
    if (missing.length === 0 && user.profileStatus === 'INCOMPLETE') {
      user.profileStatus = 'PENDING_REVIEW';
      user.missingFields = [];
      await this.userRepo.save(user);
      this.wsGateway.sendToUser(userId, 'PROFILE_STATUS_CHANGE', { status: 'PENDING_REVIEW' });
      this.logger.log(`Profil tamamlandi, admin onayi bekleniyor: ${userId}`);
    }

    return {
      status: user.profileStatus,
      missingFields: missing,
      verificationNotes: user.verificationNotes,
      verifiedAt: user.verifiedAt,
      completionPercent,
      canAccessLoads: user.profileStatus === 'VERIFIED',
    };
  }

  async submitProfile(userId: string, data: Record<string, any>): Promise<ProfileStatusResponse> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const allowedFields = [...REQUIRED_CARRIER_FIELDS, 'accountantName', 'accountantEmail', 'accountantPhone', 'companyTitle'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        (user as any)[field] = data[field];
      }
    }

    user.profileStatus = 'PENDING_REVIEW';
    user.missingFields = checkMissingFields(user) as any;
    user.verificationNotes = null as any;
    await this.userRepo.save(user);

    this.wsGateway.sendToUser(userId, 'PROFILE_STATUS_CHANGE', { status: 'PENDING_REVIEW' });
    this.logger.log(`Profil incelemeye gonderildi: ${userId}`);

    return this.getProfileStatus(userId);
  }

  async adminVerifyProfile(userId: string, approved: boolean, notes?: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    if (approved) {
      user.profileStatus = 'VERIFIED';
      user.verifiedAt = new Date();
      user.verificationNotes = null as any;
      user.missingFields = [] as any;
      this.wsGateway.sendToUser(userId, 'PROFILE_VERIFIED', { status: 'VERIFIED' });
      this.logger.log(`Admin profil onayladi: ${userId}`);
    } else {
      user.profileStatus = 'INCOMPLETE';
      user.verificationNotes = notes || 'Bilgileriniz eksik veya hatali. Lutfen duzeltin.';
      user.missingFields = checkMissingFields(user);
      this.wsGateway.sendToUser(userId, 'PROFILE_REJECTED', { status: 'INCOMPLETE', notes: user.verificationNotes });
      this.logger.log(`Admin profil reddetti: ${userId}`);
    }

    await this.userRepo.save(user);
  }
}

/** Shared helper — kullanici profilindeki eksik zorunlu alanlari dondurur */
export function checkMissingFields(user: User): string[] {
  const missing: string[] = [];
  for (const field of REQUIRED_CARRIER_FIELDS) {
    const val = (user as any)[field];
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || (typeof val === 'number' && val <= 0)) {
      missing.push(REQUIRED_FIELD_LABELS[field] || field);
    }
  }
  return missing;
}
