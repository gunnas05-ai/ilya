import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Role } from '../common/role.entity';
import { Permission } from '../common/permission.entity';
import { RolePermission } from '../common/role-permission.entity';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { PermissionTemplatesService } from '../common/permission-templates.service';

@ApiTags('admin')
@Controller({ path: 'admin/roles', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
@ApiBearerAuth()
export class AdminRoleController {
  constructor(
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
    @InjectRepository(RolePermission) private rpRepo: Repository<RolePermission>,
    private readonly templateService: PermissionTemplatesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Tum rolleri listele' })
  async listRoles() {
    const roles = await this.roleRepo.find({ relations: ['permissions', 'permissions.permission'] });
    return { success: true, data: roles };
  }

  @Post()
  @ApiOperation({ summary: 'Yeni rol olustur' })
  async createRole(@Body() body: { key: string; label: string; description?: string }) {
    const role = this.roleRepo.create({ key: body.key, label: body.label, description: body.description, isSystem: false });
    await this.roleRepo.save(role);
    return { success: true, data: role };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Rol guncelle' })
  async updateRole(@Param('id') id: string, @Body() body: { label?: string; description?: string }) {
    await this.roleRepo.update(id, body);
    const role = await this.roleRepo.findOne({ where: { id }, relations: ['permissions', 'permissions.permission'] });
    return { success: true, data: role };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Rol sil (sadece sistem disi)' })
  async deleteRole(@Param('id') id: string) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) return { success: false, message: 'Rol bulunamadi' };
    if (role.isSystem) return { success: false, message: 'Sistem rolleri silinemez' };
    // Once bagli permission'lari sil
    await this.rpRepo.delete({ roleId: id });
    await this.roleRepo.delete(id);
    return { success: true };
  }

  @Post(':id/permissions')
  @ApiOperation({ summary: 'Role permission ekle/cikar' })
  async setRolePermissions(@Param('id') id: string, @Body() body: { permissionKeys: string[]; grantedBy?: string; expiresAt?: string }) {
    // Once mevcut permission'lari temizle
    await this.rpRepo.delete({ roleId: id });
    const role = await this.roleRepo.findOne({ where: { id } });
    // Yeni permission'lari ekle (gecici yetki destegi ile)
    for (const key of body.permissionKeys) {
      const perm = await this.permRepo.findOne({ where: { key } });
      if (perm) {
        const rp = this.rpRepo.create({
          role: role?.key || '', roleId: id, permissionId: perm.id,
          grantedBy: body.grantedBy || undefined,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        } as any);
        await this.rpRepo.save(rp);
      }
    }
    // WebSocket event: canli permission refresh
    this.eventEmitter.emit('permission.changed', { role: role?.key, timestamp: new Date().toISOString() });
    const updated = await this.roleRepo.findOne({ where: { id }, relations: ['permissions', 'permissions.permission'] });
    return { success: true, data: updated };
  }

  @Post(':id/force-logout')
  @ApiOperation({ summary: 'Roldeki tum kullanicilari zorla cikis yaptir' })
  async forceLogout(@Param('id') id: string) {
    const role = await this.roleRepo.findOne({ where: { id } });
    this.eventEmitter.emit('auth.force-logout', { role: role?.key, timestamp: new Date().toISOString() });
    return { success: true, message: `${role?.key} rolundeki kullanicilara force-logout gonderildi` };
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Tum permissions lari listele' })
  async listPermissions() {
    const perms = await this.permRepo.find({ order: { group: 'ASC', label: 'ASC' } });
    return { success: true, data: perms };
  }

  @Post('permissions')
  @ApiOperation({ summary: 'Yeni permission olustur' })
  async createPermission(@Body() body: { name: string; label: string; group?: string; description?: string }) {
    const perm = this.permRepo.create(body);
    await this.permRepo.save(perm);
    return { success: true, data: perm };
  }

  @Put('permissions/:id')
  @ApiOperation({ summary: 'Permission guncelle' })
  async updatePermission(@Param('id') id: string, @Body() body: { label?: string; group?: string }) {
    await this.permRepo.update(id, body);
    return { success: true, data: await this.permRepo.findOne({ where: { id } }) };
  }

  @Delete('permissions/:id')
  @ApiOperation({ summary: 'Permission sil' })
  async deletePermission(@Param('id') id: string) {
    await this.rpRepo.delete({ permissionId: id });
    await this.permRepo.delete(id);
    return { success: true };
  }

  @Post('permissions/clone')
  @ApiOperation({ summary: 'Bir rolden permission\'lari kopyala' })
  async clonePermissions(@Body() body: { fromRoleKey: string; toRoleKey: string }) {
    const sourceRps = await this.rpRepo.find({ where: { role: body.fromRoleKey } });
    // Hedef roldeki mevcut permission'lari temizle
    await this.rpRepo.delete({ role: body.toRoleKey });
    for (const rp of sourceRps) {
      const newRp = this.rpRepo.create({ role: body.toRoleKey, permissionId: rp.permissionId });
      await this.rpRepo.save(newRp);
    }
    return { success: true, count: sourceRps.length };
  }

  @Get('templates/list')
  @ApiOperation({ summary: 'Permission sablonlarini listele' })
  getTemplates() {
    return { success: true, data: this.templateService.getTemplates() };
  }

  @Post('templates/apply')
  @ApiOperation({ summary: 'Sablonu role uygula' })
  async applyTemplate(@Body() body: { roleKey: string; templateName: string }) {
    const result = await this.templateService.applyTemplate(body.roleKey, body.templateName);
    return { success: true, count: result.count };
  }
}
