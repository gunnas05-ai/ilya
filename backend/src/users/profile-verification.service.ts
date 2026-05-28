import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { WebSocketGateway } from '../websocket/websocket.gateway';

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

  // Zorunlu alanlar
  private readonly REQUIRED_FIELDS = [
    'phone', 'licenseNumber', 'plateNumber', 'vehicleType',
    'vehicleCapacity', 'tonnageCapacity', 'volumeCapacity',
    'kBelgesi', 'srcBelgesi', 'iban', 'taxNumber', 'taxOffice',
    'tcKimlikNo',
  ];

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private wsGateway: WebSocketGateway,
  ) {}

  async getProfileStatus(userId: string): Promise<ProfileStatusResponse> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const missing = this.checkMissingFields(user);
    const completionPercent = Math.round(((this.REQUIRED_FIELDS.length - missing.length) / this.REQUIRED_FIELDS.length) * 100);

    // Otomatik değerlendirme: tüm alanlar doluysa ve doğrulama bekleyen yoksa VERIFIED
    if (missing.length === 0 && user.profileStatus === 'PENDING_REVIEW') {
      user.profileStatus = 'VERIFIED';
      user.verifiedAt = new Date();
      user.missingFields = [];
      await this.userRepo.save(user);
      this.wsGateway.sendToUser(userId, 'PROFILE_VERIFIED', { status: 'VERIFIED', verifiedAt: user.verifiedAt });
      this.logger.log(`Profil onaylandi: ${userId}`);
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

    // Alanları güncelle
    const allowedFields = [...this.REQUIRED_FIELDS, 'accountantName', 'accountantEmail', 'accountantPhone', 'companyTitle', 'companyName'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        (user as any)[field] = data[field];
      }
    }

    user.profileStatus = 'PENDING_REVIEW';
    user.missingFields = this.checkMissingFields(user) as any;
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
      user.missingFields = this.checkMissingFields(user);
      this.wsGateway.sendToUser(userId, 'PROFILE_REJECTED', { status: 'INCOMPLETE', notes: user.verificationNotes });
      this.logger.log(`Admin profil reddetti: ${userId}`);
    }

    await this.userRepo.save(user);
  }

  private checkMissingFields(user: User): string[] {
    const missing: string[] = [];
    const fieldLabels: Record<string, string> = {
      phone: 'Telefon', licenseNumber: 'Ehliyet Bilgisi', plateNumber: 'Araç Plakası',
      vehicleType: 'Araç Tipi', vehicleCapacity: 'Araç Kapasitesi', tonnageCapacity: 'Tonaj Bilgisi',
      volumeCapacity: 'Hacim Bilgisi', kBelgesi: 'K Belgesi', srcBelgesi: 'SRC Belgesi',
      iban: 'IBAN', taxNumber: 'Vergi Numarası', taxOffice: 'Vergi Dairesi', tcKimlikNo: 'T.C. Kimlik No',
    };

    for (const field of this.REQUIRED_FIELDS) {
      const val = (user as any)[field];
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || (typeof val === 'number' && val <= 0)) {
        missing.push(fieldLabels[field] || field);
      }
    }

    return missing;
  }
}
