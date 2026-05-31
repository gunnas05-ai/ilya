import { Controller, Get, Post, Delete, Param, Query, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

@ApiTags('chat')
@Controller({ path: 'chat', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ── Rooms ──

  @Get('rooms')
  async getRooms(@Req() req: any, @Query('userId') userId?: string) {
    const uid = userId || req.user?.id;
    const rooms = uid ? await this.chatService.getUserRooms(uid) : await this.chatService.getAllRooms();
    return { success: true, data: rooms, meta: { total: rooms.length } };
  }

  @Post('rooms')
  async createRoom(@Body() body: { name?: string; isGroup?: boolean; participantIds: string[]; participantNames?: string[]; createdBy?: string }, @Req() req: any) {
    const room = await this.chatService.createRoom({
      ...body,
      createdBy: body.createdBy || req.user?.id,
    });
    return { success: true, data: room };
  }

  @Get('rooms/:id')
  async getRoom(@Param('id') id: string) {
    const room = await this.chatService.getRoom(id);
    return { data: room };
  }

  @Delete('rooms/:id')
  @Roles('admin')
  async deleteRoom(@Param('id') id: string) {
    await this.chatService.deleteRoom(id);
    return { data: { success: true } };
  }

  @Post('rooms/:id/read')
  async markRoomRead(@Param('id') id: string, @Body() body: { userId: string }) {
    await this.chatService.markRoomRead(id, body.userId);
    return { data: { success: true } };
  }

  // ── Messages ──

  @Get('rooms/:id/messages')
  async getMessages(@Param('id') roomId: string, @Query('limit') limit?: string, @Query('before') before?: string) {
    const msgs = await this.chatService.getMessages(roomId, {
      limit: limit ? parseInt(limit) : 100,
      before: before || undefined,
    });
    return { data: msgs, meta: { total: msgs.length } };
  }

  @Post('rooms/:id/messages')
  async sendMessage(@Param('id') roomId: string, @Body() body: any, @Req() req: any) {
    const msg = await this.chatService.sendMessage({
      roomId,
      senderId: body.senderId || req.user?.id,
      senderName: body.senderName || req.user?.fullName || 'Kullanıcı',
      senderRole: body.senderRole || req.user?.role || 'user',
      text: body.text,
      fileUrl: body.fileUrl,
      fileName: body.fileName,
      fileType: body.fileType,
      fileSize: body.fileSize,
    });
    return { data: msg };
  }

  @Delete('messages/:id')
  async deleteMessage(@Param('id') id: string, @Body() body: { userId: string }) {
    await this.chatService.deleteMessage(id, body.userId);
    return { data: { success: true } };
  }

  @Post('messages/:id/read')
  async markRead(@Param('id') id: string, @Body() body: { userId: string }) {
    await this.chatService.markMessageRead(id, body.userId);
    return { data: { success: true } };
  }

  // ── Unread counts ──

  @Get('unread')
  async getUnread(@Query('userId') userId: string) {
    const counts = await this.chatService.getUnreadCounts(userId);
    return { data: counts };
  }

  // ── Search ──

  @Get('search')
  async searchMessages(@Query('q') query: string, @Query('roomId') roomId?: string) {
    const results = await this.chatService.searchMessages(query, roomId);
    return { data: results, meta: { total: results.length } };
  }
}
