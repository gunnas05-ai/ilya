import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LanguageService } from './language.service';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller('language')
export class LanguageController {
  constructor(private languageService: LanguageService) {}

  /** Public: Get available languages */
  @Get('available')
  async getAvailable() {
    return this.languageService.getAvailableLanguages();
  }

  /** Admin: Toggle multi-language support */
  @Post('admin/toggle')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  async toggleMultiLanguage(@Body() body: { enabled: boolean }, @Req() req: any) {
    return this.languageService.setMultiLanguageEnabled(body.enabled, req.user.id);
  }

  /** Admin: Get all system language settings */
  @Get('admin/settings')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  async getSettings() {
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
