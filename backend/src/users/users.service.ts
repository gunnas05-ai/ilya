import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

// Single source of truth — tum dogrulama sistemleri bu listeden beslenir
export const REQUIRED_CARRIER_FIELDS: (keyof User)[] = [
  'phone',
  'licenseNumber',
  'plateNumber',
  'vehicleType',
  'vehicleCapacity',
  'tonnageCapacity',
  'volumeCapacity',
  'kBelgesi',
  'srcBelgesi',
  'iban',
  'taxNumber',
  'taxOffice',
  'tcKimlikNo',
];

export const REQUIRED_FIELD_LABELS: Record<string, string> = {
  phone: 'Telefon',
  licenseNumber: 'Ehliyet Bilgisi',
  plateNumber: 'Araç Plakası',
  vehicleType: 'Araç Tipi',
  vehicleCapacity: 'Araç Kapasitesi',
  tonnageCapacity: 'Tonaj Bilgisi',
  volumeCapacity: 'Hacim Bilgisi',
  kBelgesi: 'K Belgesi',
  srcBelgesi: 'SRC Belgesi',
  iban: 'IBAN',
  taxNumber: 'Vergi Numarası',
  taxOffice: 'Vergi Dairesi',
  tcKimlikNo: 'T.C. Kimlik No',
};

// Alanlar: kullanicinin kendi profilinde degistirebilecegi guvenli alanlar
const ALLOWED_PROFILE_FIELDS: (keyof User)[] = [
  'fullName',
  'licenseNumber',
  'plateNumber',
  'vehicleType',
  'vehicleCapacity',
  'tonnageCapacity',
  'volumeCapacity',
  'vehicleHeight',
  'vehicleWidth',
  'vehicleLength',
  'totalWeight',
  'axleWeight',
  'adrClass',
  'trailerType',
  'hasRefrigeration',
  'kBelgesi',
  'srcBelgesi',
  'srcBelgeNo',
  'srcBelgeSonTarih',
  'ehliyetSonTarih',
  'licenseType',
  'companyTitle',
  'authorizedPerson',
  'businessType',
  'businessAddress',
  'accountantName',
  'accountantEmail',
  'accountantPhone',
  'taxOffice',
];

// Degistirilmesi re-verification gerektiren hassas alanlar
const SENSITIVE_FIELDS: (keyof User)[] = [
  'email',
  'phone',
  'tcKimlikNo',
  'iban',
  'taxNumber',
];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async updateProfile(userId: string, data: Partial<User>) {
    // Hassas alanlari filtrele — bunlar ozel dogrulama akisi gerektirir
    const safeData: any = {};
    for (const key of ALLOWED_PROFILE_FIELDS) {
      if (key in data) {
        safeData[key] = (data as any)[key];
      }
    }

    // Hassas alan degisikligi tespit edilirse reddet
    const changedSensitive = SENSITIVE_FIELDS.filter(
      (field) => field in data && (data as any)[field] !== undefined,
    );
    if (changedSensitive.length > 0) {
      throw new BadRequestException(
        `Bu alanları güncellemek için ayrı bir doğrulama süreci gereklidir: ${changedSensitive.join(', ')}`,
      );
    }

    if (Object.keys(safeData).length > 0) {
      await this.userRepo.update(userId, safeData);
    }
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async getCompletionPercent(userId: string): Promise<number> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return 0;
    const filled = REQUIRED_CARRIER_FIELDS.filter((field) => {
      const val = (user as any)[field];
      return val !== null && val !== undefined && val !== '';
    }).length;
    return Math.round((filled / REQUIRED_CARRIER_FIELDS.length) * 100);
  }

  async getMissingFields(userId: string): Promise<string[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return REQUIRED_CARRIER_FIELDS.map(f => REQUIRED_FIELD_LABELS[f] || f);
    return REQUIRED_CARRIER_FIELDS.filter((field) => {
      const val = (user as any)[field];
      return !val || val === '' || (typeof val === 'number' && val <= 0);
    }).map((f) => REQUIRED_FIELD_LABELS[f] || f);
  }

  async getAllCarriers() {
    return this.userRepo.find({
      where: { role: 'tasiyici' as any },
      select: ['id', 'fullName', 'vehicleType', 'tonnageCapacity', 'rating', 'completedLoads'],
    });
  }

  async findAllUsers() {
    return this.userRepo.find({
      select: ['id', 'email', 'phone', 'fullName', 'role', 'isActive', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }

  async toggleUserStatus(id: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) return null;
    user.isActive = !user.isActive;
    // Deaktive edilen kullanicinin refresh token'ini gecersiz kil
    if (!user.isActive) {
      user.refreshToken = null as any;
    }
    return this.userRepo.save(user);
  }

  async updateUserRole(id: string, role: any): Promise<User | null> {
    // Validate role is a valid UserRole enum value
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(role)) {
      throw new BadRequestException(`Geçersiz rol: ${role}. Geçerli roller: ${validRoles.join(', ')}`);
    }
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) return null;
    user.role = role as UserRole;
    return this.userRepo.save(user);
  }
}
