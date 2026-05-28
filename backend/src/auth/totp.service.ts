import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../users/user.entity';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const otplib = require('otplib');
const { authenticator } = otplib;

@Injectable()
export class TotpService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /** Generate TOTP secret + QR code URI for Google Authenticator */
  async enableTotp(userId: string): Promise<{ secret: string; qrCodeUri: string; backupCodes: string[] }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Kullanıcı bulunamadı');

    const secret = authenticator.generateSecret();
    const qrCodeUri = authenticator.keyuri(user.email, 'KAPTAN Lojistik', secret);

    // Generate 8 backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
    }

    user.totpSecret = secret;
    user.mfaEnabled = true;
    user.backupCodes = JSON.stringify(
      backupCodes.map((c) => crypto.createHash('sha256').update(c).digest('hex')),
    );
    await this.userRepo.save(user);

    return { secret, qrCodeUri, backupCodes };
  }

  /** Verify TOTP token */
  async verifyTotp(userId: string, token: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.totpSecret) throw new BadRequestException('TOTP etkin değil');

    // Check TOTP
    const valid = authenticator.verify({ token, secret: user.totpSecret });
    if (valid) return true;

    // Fallback: backup codes
    if (user.backupCodes) {
      const codes: string[] = JSON.parse(user.backupCodes);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const backupIndex = codes.indexOf(tokenHash);
      if (backupIndex >= 0) {
        // Remove used backup code
        codes.splice(backupIndex, 1);
        user.backupCodes = JSON.stringify(codes);
        await this.userRepo.save(user);
        return true;
      }
    }

    return false;
  }

  /** Disable TOTP (requires valid TOTP token) */
  async disableTotp(userId: string, token: string): Promise<void> {
    const valid = await this.verifyTotp(userId, token);
    if (!valid) throw new BadRequestException('Geçersiz TOTP kodu');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Kullanıcı bulunamadı');
    user.totpSecret = null;
    user.mfaEnabled = false;
    user.backupCodes = null;
    await this.userRepo.save(user);
  }

  /** Check if MFA is required for wallet operations */
  async requireMfaForWallet(userId: string): Promise<{ required: boolean; challengeToken?: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Kullanıcı bulunamadı');

    if (user.mfaEnabled || user.mfaRequiredForWallet) {
      const challengeToken = crypto.randomBytes(16).toString('hex');
      // Store challenge temporarily on user (valid 5 min)
      user.otpCode = challengeToken;
      user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await this.userRepo.save(user);
      return { required: true, challengeToken };
    }

    return { required: false };
  }

  /** Verify MFA for wallet operation */
  async verifyWalletMfa(userId: string, totpToken: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Kullanıcı bulunamadı');

    if (!user.otpCode || !user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      throw new BadRequestException('MFA doğrulama süresi dolmuş. İşlemi yeniden başlatın.');
    }

    const valid = await this.verifyTotp(userId, totpToken);
    if (valid) {
      user.otpCode = null;
      user.otpExpiresAt = null;
      await this.userRepo.save(user);
    }
    return valid;
  }
}
