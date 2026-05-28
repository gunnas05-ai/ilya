import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './system-setting.entity';

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
    return {
      text: setting?.value || 'Gizlilik Sözleşmesi metni henüz tanımlanmamıştır.',
      updatedAt: setting?.updatedAt || null,
    };
  }

  /** Admin: Update privacy agreement or KVKK text */
  @Post('admin/update')
  async updateText(@Body() body: { key: string; text: string }, @Req() req: any) {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
      return { success: false, message: 'Yetkisiz erişim' };
    }

    const existing = await this.settingsRepo.findOne({ where: { key: body.key } });
    if (existing) {
      existing.value = body.text;
      existing.updatedBy = req.user.id;
      await this.settingsRepo.save(existing);
    } else {
      await this.settingsRepo.save(
        this.settingsRepo.create({
          key: body.key,
          value: body.text,
          description: body.key === 'privacy_agreement_text' ? 'Gizlilik Sözleşmesi metni' : 'KVKK metni',
          updatedBy: req.user.id,
        }),
      );
    }
    return { success: true, message: 'Metin güncellendi.' };
  }

  /** Admin: Get all legal texts */
  @Get('admin/all')
  async getAllTexts(@Req() req: any) {
    const settings = await this.settingsRepo.find({
      where: [{ key: 'privacy_agreement_text' }, { key: 'kvkk_text' }],
    });
    const result: Record<string, string> = {};
    settings.forEach((s) => { result[s.key] = s.value; });
    return result;
  }
}
