import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemSetting } from './system-setting.entity';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@ApiTags('admin')
@Controller({ path: 'admin/settings', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
@ApiBearerAuth()
export class SystemSettingsController {
  constructor(
    @InjectRepository(SystemSetting) private settingRepo: Repository<SystemSetting>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Tum sistem ayarlarini listele' })
  async getAll() {
    const settings = await this.settingRepo.find();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return { success: true, data: { settings: result, raw: settings } };
  }

  @Put()
  @ApiOperation({ summary: 'Sistem ayarlarini toplu guncelle' })
  async updateAll(@Body() body: Record<string, string>, @Req() req: any) {
    for (const [key, value] of Object.entries(body)) {
      if (key === 'settings' || key === 'raw') continue;
      const existing = await this.settingRepo.findOne({ where: { key } });
      if (existing) {
        existing.value = String(value);
        existing.updatedBy = req.user.email;
        await this.settingRepo.save(existing);
      } else {
        await this.settingRepo.save(
          this.settingRepo.create({ key, value: String(value), updatedBy: req.user.email, description: 'Admin panelinden eklendi' }),
        );
      }
    }
    return { success: true, message: `${Object.keys(body).length} ayar guncellendi` };
  }

  @Get('public')
  @ApiOperation({ summary: 'Herkese acik ayarlar (auth gerektirmez)' })
  async getPublic() {
    const settings = await this.settingRepo.find();
    const result: Record<string, string> = {};
    for (const s of settings) {
      // Sadece public_ prefix'li ayarlari goster
      if (s.key.startsWith('public_') || s.key === 'app_version' || s.key === 'min_app_version') {
        result[s.key] = s.value;
      }
    }
    return { success: true, data: result };
  }
}
