import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SystemSetting } from './system-setting.entity';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@ApiTags('legal')
@Controller('sozlesmeler')
export class SozlesmeController {
  constructor(
    @InjectRepository(SystemSetting)
    private settingsRepo: Repository<SystemSetting>,
  ) {}

  /** Public: Get privacy agreement text for registration screen */
  @Get('gizlilik')
  async getPrivacyAgreement() {
    const setting = await this.settingsRepo.findOne({
      where: { key: 'privacy_agreement_text' },
    });
    return { success: true, data: {
      text: setting?.value || 'Gizlilik Sözleşmesi metni henüz tanımlanmamıştır.',
      updatedAt: setting?.updatedAt || null,
    }};
  }

  /** Admin: Update privacy agreement or KVKK text */
  @Post('admin/update')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @ApiBearerAuth()
  async updateText(@Body() body: { key: string; text: string }) {
    const existing = await this.settingsRepo.findOne({ where: { key: body.key } });
    if (existing) {
      existing.value = body.text;
      await this.settingsRepo.save(existing);
    } else {
      await this.settingsRepo.save(
        this.settingsRepo.create({
          key: body.key,
          value: body.text,
          description: body.key === 'privacy_agreement_text' ? 'Gizlilik Sözleşmesi metni' : 'KVKK metni',
        }),
      );
    }
    return { success: true, message: 'Metin güncellendi.' };
  }

  /** Admin: Get all legal texts */
  @Get('admin/all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  @ApiBearerAuth()
  async getAllTexts() {
    const settings = await this.settingsRepo.find({
      where: [{ key: 'privacy_agreement_text' }, { key: 'kvkk_text' }],
    });
    const result: Record<string, string> = {};
    settings.forEach((s) => { result[s.key] = s.value; });
    return { success: true, data: result };
  }
}
