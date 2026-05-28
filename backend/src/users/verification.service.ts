import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async verifyIdentity(userId: string, tcKimlikNo: string, firstName: string, lastName: string, birthYear: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    // MOCK: In production, this would call NVİ SOAP API or similar
    // For now, if tc is 11 digits, we mock a successful validation
    if (tcKimlikNo.length !== 11) {
      throw new BadRequestException('T.C. Kimlik No 11 haneli olmalıdır.');
    }

    user.tcKimlikNo = tcKimlikNo;
    user.isIdentityVerified = true;
    return this.userRepository.save(user);
  }

  async verifyCarrierDocs(userId: string, plateNumber?: string, srcBelgeNo?: string, kBelgesiNo?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    // MOCK: In production, this would call e-Devlet or KGM APIs
    let updated = false;

    if (plateNumber) {
      user.plateNumber = plateNumber;
      user.isPlateVerified = true;
      updated = true;
    }

    if (srcBelgeNo) {
      user.srcBelgesi = srcBelgeNo;
      user.isSrcVerified = true;
      updated = true;
    }

    if (kBelgesiNo) {
      user.kBelgesi = kBelgesiNo;
      user.isKBelgesiVerified = true;
      updated = true;
    }

    if (updated) {
      return this.userRepository.save(user);
    }
    
    return user;
  }
}
