import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

export const REQUIRED_CARRIER_FIELDS = [
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
    await this.userRepo.update(userId, data);
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
    if (!user) return REQUIRED_CARRIER_FIELDS;
    const fieldLabels: Record<string, string> = {
      licenseNumber: 'Ehliyet Bilgisi',
      plateNumber: 'Araç Plakası',
      vehicleType: 'Araç Tipi',
      vehicleCapacity: 'Araç Kapasitesi',
      tonnageCapacity: 'Tonaj Bilgisi',
      volumeCapacity: 'Hacim Bilgisi',
      kBelgesi: 'K Belgesi',
      srcBelgesi: 'SRC Belgesi',
      iban: 'IBAN',
      taxNumber: 'Vergi Bilgisi',
    };
    return REQUIRED_CARRIER_FIELDS.filter((field) => {
      const val = (user as any)[field];
      return !val || val === '';
    }).map((f) => fieldLabels[f] || f);
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
    return this.userRepo.save(user);
  }

  async updateUserRole(id: string, role: any): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) return null;
    user.role = role;
    return this.userRepo.save(user);
  }
}
