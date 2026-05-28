import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './system-setting.entity';

export const SUPPORTED_LANGUAGES = [
  { code: 'tr', name: 'Türkçe', nativeName: 'Türkçe', flag: '🇹🇷', isDefault: true },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', isDefault: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', isDefault: false },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', isDefault: false },
];

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

@Injectable()
export class LanguageService {
  private readonly logger = new Logger(LanguageService.name);

  // In-memory cache (refreshed from DB on change)
  private multiLanguageEnabled: boolean | null = null;

  constructor(
    @InjectRepository(SystemSetting)
    private settingsRepo: Repository<SystemSetting>,
  ) {}

  /** Check if multi-language support is enabled by admin */
  async isMultiLanguageEnabled(): Promise<boolean> {
    if (this.multiLanguageEnabled !== null) return this.multiLanguageEnabled;

    const setting = await this.settingsRepo.findOne({
      where: { key: 'multi_language_enabled' },
    });
    this.multiLanguageEnabled = setting?.value === 'true';
    return this.multiLanguageEnabled;
  }

  /** Admin toggles multi-language support */
  async setMultiLanguageEnabled(enabled: boolean, adminId: string): Promise<{ enabled: boolean }> {
    const existing = await this.settingsRepo.findOne({
      where: { key: 'multi_language_enabled' },
    });

    if (existing) {
      existing.value = String(enabled);
      existing.updatedBy = adminId;
      await this.settingsRepo.save(existing);
    } else {
      await this.settingsRepo.save(
        this.settingsRepo.create({
          key: 'multi_language_enabled',
          value: String(enabled),
          description: 'Çoklu dil desteği admin onayı',
          updatedBy: adminId,
        }),
      );
    }

    // Bust cache
    this.multiLanguageEnabled = enabled;
    this.logger.log(`Multi-language ${enabled ? 'ENABLED' : 'DISABLED'} by admin ${adminId}`);

    return { enabled };
  }

  /** Get available languages (respects admin flag) */
  async getAvailableLanguages(): Promise<{
    enabled: boolean;
    available: SupportedLanguage[];
    active: SupportedLanguage[];
  }> {
    const enabled = await this.isMultiLanguageEnabled();

    return {
      enabled,
      available: SUPPORTED_LANGUAGES,
      active: enabled ? SUPPORTED_LANGUAGES : [SUPPORTED_LANGUAGES[0]], // Only TR if disabled
    };
  }

  /** Get localized message based on Accept-Language header */
  getLocalizedMessage(
    acceptLanguage: string,
    messages: Record<string, string>,
    fallback = 'İşlem başarılı',
  ): string {
    const langs = acceptLanguage?.split(',') || [];
    for (const lang of langs) {
      const code = lang.trim().substring(0, 2);
      if (messages[code]) return messages[code];
    }
    return messages['tr'] || fallback;
  }
}
