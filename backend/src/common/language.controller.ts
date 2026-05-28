import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LanguageService } from './language.service';

@Controller('language')
export class LanguageController {
  constructor(private languageService: LanguageService) {}

  /** Public: Get available languages (respects admin flag) */
  @Get('available')
  async getAvailable() {
    return this.languageService.getAvailableLanguages();
  }

  /** Admin: Toggle multi-language support */
  @Post('admin/toggle')
  @UseGuards(AuthGuard('jwt'))
  async toggleMultiLanguage(@Body() body: { enabled: boolean }, @Req() req: any) {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return { success: false, message: 'Yetkisiz erişim' };
    }
    return this.languageService.setMultiLanguageEnabled(body.enabled, req.user.id);
  }

  /** Admin: Get all system language settings */
  @Get('admin/settings')
  @UseGuards(AuthGuard('jwt'))
  async getSettings(@Req() req: any) {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return { success: false, message: 'Yetkisiz erişim' };
    }
    const enabled = await this.languageService.isMultiLanguageEnabled();
    return {
      multiLanguageEnabled: enabled,
      supportedLanguages: [
        { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'ar', name: 'العربية', flag: '🇸🇦' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' },
      ],
    };
  }
}
