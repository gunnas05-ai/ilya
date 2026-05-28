import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/user.entity';
import { UIRole, RegisterDto } from './auth.controller';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  // ── UI Role → DB Role mapping ──────────────────────────────
  private mapUIRole(uiRole: UIRole): UserRole {
    const map: Record<UIRole, UserRole> = {
      [UIRole.FIRMA]:    UserRole.YUK_VEREN,
      [UIRole.TASIYICI]: UserRole.TASIYICI,
      [UIRole.ISLETME]:  UserRole.ISLETME,
      [UIRole.GENEL]:    UserRole.GENEL,
    };
    return map[uiRole] || UserRole.GENEL;
  }

  // ── OTP helpers ────────────────────────────────────────────
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendOtpMock(phone: string, otp: string): Promise<void> {
    // MOCK: In production, integrate Netgsm/Twilio here
    this.logger.log(`[MOCK SMS] Telefon: ${phone} → OTP: ${otp} (5 dk geçerli)`);
  }

  // ── Register ───────────────────────────────────────────────
  async register(dto: RegisterDto) {
    if (!dto.kvkkAccepted || !dto.termsAccepted) {
      throw new BadRequestException('KVKK ve kullanıcı sözleşmesi onayı zorunludur');
    }

    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { phone: dto.phone }],
    });
    if (existing) {
      throw new BadRequestException('Bu email veya telefon zaten kayıtlı');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const dbRole = this.mapUIRole(dto.uiRole);

    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const user = this.userRepo.create({
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      fullName: dto.fullName,
      role: dbRole,
      registrationStep: 'otp_sent',
      isPhoneVerified: false,
      otpCode,
      otpExpiresAt,
      // FIRMA fields
      companyTitle: dto.companyTitle,
      taxNumber: dto.taxNo,
      taxOffice: dto.taxOfficeName,
      authorizedPerson: dto.authorizedPerson,
      // TASIYICI fields
      licenseType: dto.licenseType,
      vehicleType: dto.vehicleType,
      plateNumber: dto.plateNumber,
      srcBelgesi: dto.srcBelgesi,
      // ISLETME fields
      businessType: dto.businessType,
      businessAddress: dto.businessAddress,
    });

    await this.userRepo.save(user);
    await this.sendOtpMock(dto.phone, otpCode);

    return {
      success: true,
      userId: user.id,
      message: 'Kayıt başarılı. Telefonunuza gönderilen OTP kodunu girin.',
    };
  }

  // ── Verify OTP ─────────────────────────────────────────────
  async verifyOtp(userId: string, otpCode: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Kullanıcı bulunamadı');

    if (user.otpCode !== otpCode) {
      throw new BadRequestException('OTP kodu hatalı');
    }

    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      throw new BadRequestException('OTP kodunun süresi dolmuş. Yeniden gönderin.');
    }

    user.isPhoneVerified = true;
    user.isActive = true;
    user.registrationStep = 'completed';
    user.otpCode = null;
    user.otpExpiresAt = null;
    await this.userRepo.save(user);

    return this.generateTokens(user);
  }

  // ── Resend OTP ─────────────────────────────────────────────
  async resendOtp(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Kullanıcı bulunamadı');

    const otpCode = this.generateOtp();
    user.otpCode = otpCode;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.userRepo.save(user);
    await this.sendOtpMock(user.phone, otpCode);

    return { success: true, message: 'Yeni OTP kodunuz gönderildi.' };
  }

  // ── Login ──────────────────────────────────────────────────
  async login(email: string, password: string, deviceFingerprint?: string, rememberMe?: boolean) {
    if (!password) throw new UnauthorizedException('Email veya şifre hatalı');

    const user = await this.userRepo.findOne({ where: { email: email.trim().toLowerCase() } });

    if (!user) throw new UnauthorizedException('Email veya şifre hatalı');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Email veya şifre hatalı');

    if (!user.isActive) throw new UnauthorizedException('Hesabınız aktif değil');

    if (deviceFingerprint) {
      user.deviceFingerprint = deviceFingerprint;
      await this.userRepo.save(user);
    }

    return this.generateTokens(user, rememberMe);
  }

  // ── Refresh Token ──────────────────────────────────────────
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || (() => { throw new Error('JWT_REFRESH_SECRET env var is required'); })(),
      });
      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Geçersiz refresh token');
      }
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Refresh token süresi dolmuş');
    }
  }

  // ── Validate ───────────────────────────────────────────────
  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('Kullanıcı bulunamadı');
    return user;
  }

  async updateDeviceFingerprint(userId: string, fingerprint: string) {
    await this.userRepo.update(userId, { deviceFingerprint: fingerprint });
  }

  // ── Token Generation ───────────────────────────────────────
  private async generateTokens(user: User, rememberMe?: boolean) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || (() => { throw new Error('JWT_REFRESH_SECRET env var is required'); })(),
      expiresIn: rememberMe ? '30d' : '7d',
    });

    user.refreshToken = refreshToken;
    await this.userRepo.save(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        isPhoneVerified: user.isPhoneVerified,
        companyTitle: user.companyTitle,
        businessType: user.businessType,
      },
    };
  }
}
