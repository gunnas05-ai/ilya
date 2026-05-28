import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Get('latest')
  async getLatest() {
    const ann = await this.service.getLatest();
    return ann ? { content: ann.content, updatedAt: ann.updatedAt } : null;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  async createOrUpdate(@Body('content') content: string) {
    const ann = await this.service.createOrUpdate(content || '');
    return { content: ann.content, updatedAt: ann.updatedAt };
  }
}
