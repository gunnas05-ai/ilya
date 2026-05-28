import { Controller, Get, Put, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private notifService: NotificationsService) {}

  @Get()
  async getNotifications(@Req() req: any, @Query('page') page?: number) {
    return this.notifService.getForUser(req.user.id, page ? +page : 1);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    return { count: await this.notifService.getUnreadCount(req.user.id) };
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    await this.notifService.markAsRead(id, req.user.id);
    return { success: true };
  }

  @Put('read-all')
  async markAllAsRead(@Req() req: any) {
    await this.notifService.markAllAsRead(req.user.id);
    return { success: true };
  }
}
