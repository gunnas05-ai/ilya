import { Controller, Post, Body, Get, HttpCode, HttpStatus, UseGuards, Req, Headers, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TotpService } from './totp.service';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { UserRole } from '../users/user.entity';

// UI-level roles (what the registration form shows)
export enum UIRole {
  FIRMA = 'FIRMA',         // → yuk_veren
  TASIYICI = 'TASIYICI',  // → tasiyici
  ISLETME = 'ISLETME',    // → isletme
  GENEL = 'GENEL',         // → genel
}

export class RegisterDto {
  @IsEmail({}, { message: 'Geçerli bir email giriniz' })
  email: string;

  @IsString()
  @MinLength(10, { message: 'Geçerli bir telefon numarası giriniz' })
  phone: string;

  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
  password: string;

  @IsString()
  @MinLength(2, { message: 'Ad soyad en az 2 karakter olmalıdır' })
  fullName: string;

  @IsEnum(UIRole, { message: 'Geçerli bir rol seçiniz' })
  uiRole: UIRole;

  @IsBoolean()
  kvkkAccepted: boolean;

  @IsBoolean()
  termsAccepted: boolean;

  // FIRMA specific
  @IsOptional() @IsString() companyTitle?: string;
  @IsOptional() @IsString() taxNo?: string;
  @IsOptional() @IsString() taxOfficeName?: string;
  @IsOptional() @IsString() authorizedPerson?: string;

  // TASIYICI specific
  @IsOptional() @IsString() licenseType?: string;
  @IsOptional() @IsString() vehicleType?: string;
  @IsOptional() @IsString() plateNumber?: string;
  @IsOptional() @IsString() srcBelgesi?: string;

  // ISLETME specific
  @IsOptional() @IsString() businessType?: string;
  @IsOptional() @IsString() businessAddress?: string;

  // GENEL
  @IsOptional() @IsString() inviteCode?: string;
}

export class VerifyOtpDto {
  @IsString() userId: string;
  @IsString() otpCode: string;
}

export class ResendOtpDto {
  @IsString() userId: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Geçerli bir email giriniz' })
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  rememberMe?: boolean;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private totpService: TotpService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 kayit/dakika
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 dogrulama/dakika
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.userId, dto.otpCode);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 2, ttl: 120000 } }) // 2 yeniden gonderim/2dk
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto.userId);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 giris/dakika (brute-force koruma)
  async login(@Body() dto: LoginDto, @Headers('x-device-fingerprint') fingerprint?: string) {
    return this.authService.login(dto.email, dto.password, fingerprint, dto.rememberMe);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    return { message: 'Başarıyla çıkış yapıldı' };
  }

  // ── EX-019: MFA / 2FA Endpoints ─────────────────────────────
  @Post('mfa/enable')
  @UseGuards(AuthGuard('jwt'))
  async enableMfa(@Req() req: any) {
    return this.totpService.enableTotp(req.user.id);
  }

  @Post('mfa/verify')
  @UseGuards(AuthGuard('jwt'))
  async verifyMfa(@Req() req: any, @Body() body: { token: string }) {
    const valid = await this.totpService.verifyTotp(req.user.id, body.token);
    return { valid, message: valid ? 'TOTP doğrulandı' : 'Geçersiz kod' };
  }

  @Post('mfa/disable')
  @UseGuards(AuthGuard('jwt'))
  async disableMfa(@Req() req: any, @Body() body: { token: string }) {
    await this.totpService.disableTotp(req.user.id, body.token);
    return { success: true, message: 'MFA devre dışı bırakıldı' };
  }

  @Get('mfa/status')
  @UseGuards(AuthGuard('jwt'))
  async mfaStatus(@Req() req: any) {
    return {
      mfaEnabled: req.user.mfaEnabled,
      mfaRequiredForWallet: req.user.mfaRequiredForWallet,
    };
  }

  @Post('mfa/wallet-challenge')
  @UseGuards(AuthGuard('jwt'))
  async walletMfaChallenge(@Req() req: any) {
    return this.totpService.requireMfaForWallet(req.user.id);
  }

  @Post('mfa/wallet-verify')
  @UseGuards(AuthGuard('jwt'))
  async walletMfaVerify(@Req() req: any, @Body() body: { token: string }) {
    const valid = await this.totpService.verifyWalletMfa(req.user.id, body.token);
    if (!valid) throw new Error('Geçersiz TOTP kodu');
    return { success: true, message: 'Cüzdan işlemi için MFA doğrulandı' };
  }
}
