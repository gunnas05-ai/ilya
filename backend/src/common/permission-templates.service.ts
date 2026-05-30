import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from './role-permission.entity';
import { Permission } from './permission.entity';
import { Role } from './role.entity';

export interface PermissionTemplate {
  name: string;
  description: string;
  permissions: string[];
}

@Injectable()
export class PermissionTemplatesService {
  constructor(
    @InjectRepository(RolePermission) private rpRepo: Repository<RolePermission>,
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
  ) {}

  getTemplates(): PermissionTemplate[] {
    return [
      {
        name: 'Tam Yetkili Admin',
        description: 'Sistemdeki tum yetkiler',
        permissions: [], // Tumu — doldurulacak
      },
      {
        name: 'Yuk Veren (Shipper)',
        description: 'Yuk olusturma, teklif yonetimi, finans goruntuleme',
        permissions: ['load:create', 'load:edit', 'load:delete', 'load:view', 'load:track', 'load:bid',
          'bid:accept', 'bid:reject', 'bid:view',
          'gib:view_invoices', 'gib:create_invoice',
          'finance:view', 'finance:view_dashboard',
          'escrow:use', 'profile:edit', 'profile:view_wallet',
          'roadside:view_fuel', 'roadside:view_restaurants',
          'chat:use', 'analytics:view'],
      },
      {
        name: 'Tasiyici (Driver)',
        description: 'Yuk bulma, teklif verme, takip, yol ustu hizmetler',
        permissions: ['load:view', 'load:bid', 'load:accept', 'load:track',
          'bid:create', 'bid:view',
          'gib:view_invoices', 'gib:create_invoice',
          'finance:view', 'finance:create_expense',
          'escrow:use', 'escrow:dispute',
          'profile:edit', 'profile:verify_docs', 'profile:view_wallet',
          'roadside:view_fuel', 'roadside:view_restaurants', 'roadside:make_reservation', 'roadside:write_review',
          'analytics:view', 'chat:use', 'notifications:view', 'drive_mode:use'],
      },
      {
        name: 'Sofor (Basic Driver)',
        description: 'Temel yuk goruntuleme, yol ustu hizmetler, surus modu',
        permissions: ['load:view', 'load:bid', 'load:accept', 'load:track',
          'bid:view', 'roadside:view_fuel', 'roadside:view_restaurants', 'roadside:make_reservation',
          'profile:edit', 'chat:use', 'drive_mode:use', 'notifications:view'],
      },
      {
        name: 'Isletme Sahibi',
        description: 'Isletme yonetimi, marketplace, yol ustu hizmetler',
        permissions: ['load:view', 'finance:view', 'profile:edit',
          'marketplace:view', 'roadside:view_fuel', 'roadside:view_restaurants', 'roadside:write_review',
          'analytics:view', 'chat:use', 'notifications:view'],
      },
      {
        name: 'Genel Kullanici',
        description: 'Temel goruntuleme, marketplace, yol ustu hizmetler',
        permissions: ['load:view', 'finance:view', 'profile:edit',
          'marketplace:view', 'marketplace:buy',
          'roadside:view_fuel', 'roadside:view_restaurants', 'roadside:write_review',
          'chat:use', 'notifications:view'],
      },
      {
        name: 'Muhasebeci',
        description: 'Finans yonetimi, e-belge, fatura islemleri',
        permissions: ['gib:view_invoices', 'gib:create_invoice', 'gib:send_gib',
          'finance:view', 'finance:view_dashboard', 'finance:create_expense', 'finance:create_income', 'finance:manage_budget',
          'escrow:dispute', 'profile:edit', 'profile:view_wallet', 'notifications:view'],
      },
      {
        name: 'Misafir',
        description: 'Sadece temel goruntuleme',
        permissions: ['load:view', 'roadside:view_fuel', 'roadside:view_restaurants'],
      },
    ];
  }

  async applyTemplate(roleKey: string, templateName: string): Promise<{ count: number }> {
    const templates = this.getTemplates();
    let template = templates.find((t) => t.name === templateName);
    if (!template) throw new Error('Sablon bulunamadi');

    // Tam Yetkili Admin icin tum permission'lari getir
    if (templateName === 'Tam Yetkili Admin') {
      const allPerms = await this.permRepo.find();
      template = { ...template, permissions: allPerms.map((p) => p.key) };
    }

    // Once mevcut permission'lari temizle
    await this.rpRepo.delete({ role: roleKey });

    // Yeni permission'lari ekle
    for (const key of template.permissions) {
      const perm = await this.permRepo.findOne({ where: { key } });
      if (perm) {
        await this.rpRepo.save(this.rpRepo.create({ role: roleKey, permissionId: perm.id }));
      }
    }

    // Role entity'sini de guncelle (varsa)
    const role = await this.roleRepo.findOne({ where: { key: roleKey } });
    if (role) {
      await this.rpRepo.update({ role: roleKey }, { roleId: role.id });
    }

    return { count: template.permissions.length };
  }
}
