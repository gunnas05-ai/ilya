import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommunityService } from './community.service';

@Controller('community')
export class CommunityController {
  constructor(private community: CommunityService) {}

  @Get('feed')
  async getFeed(@Query('page') page?: string) {
    return this.community.getFeed(page ? parseInt(page) : 1);
  }

  @Post('feed')
  @UseGuards(AuthGuard('jwt'))
  async createPost(@Body() body: any, @Req() req: any) {
    return this.community.createPost({
      authorId: req.user.id,
      authorName: req.user.fullName || 'Sürücü',
      content: body.content,
      imageUrl: body.imageUrl,
      latitude: body.latitude,
      longitude: body.longitude,
      locationName: body.locationName,
    });
  }

  @Post('feed/:id/helpful')
  @UseGuards(AuthGuard('jwt'))
  async markHelpful(@Param('id') id: string, @Req() req: any) {
    return this.community.markHelpful(id, req.user.id);
  }

  @Get('feed/:id/comments')
  async getComments(@Param('id') id: string) {
    return this.community.getComments(id);
  }

  @Post('feed/:id/comments')
  @UseGuards(AuthGuard('jwt'))
  async addComment(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.community.addComment({
      postId: id,
      authorId: req.user.id,
      authorName: req.user.fullName || 'Sürücü',
      content: body.content,
    });
  }

  @Get('road-reports')
  async getNearbyReports(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.community.getNearbyReports(parseFloat(lat), parseFloat(lng));
  }

  @Post('road-reports')
  @UseGuards(AuthGuard('jwt'))
  async reportRoad(@Body() body: any) {
    return this.community.reportRoadCondition(body);
  }

  @Post('road-reports/:id/confirm')
  @UseGuards(AuthGuard('jwt'))
  async confirmReport(@Param('id') id: string) {
    return this.community.confirmReport(id);
  }
}
