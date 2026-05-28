import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileVerificationService } from './profile-verification.service';

@ApiTags('users')
@Controller({ path: 'users/profile', version: '1' })
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ProfileVerificationController {
  constructor(private readonly service: ProfileVerificationService) {}

  @Get('status')
  @ApiOperation({ summary: 'Profil dogrulama durumunu getir' })
  async getStatus(@Req() req: any) {
    return this.service.getProfileStatus(req.user.id);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Profili incelemeye gonder' })
  async submit(@Req() req: any, @Body() body: any) {
    return this.service.submitProfile(req.user.id, body);
  }

  @Post('admin/verify')
  @ApiOperation({ summary: 'Admin: Profili onayla/reddet' })
  async adminVerify(@Body() body: { userId: string; approved: boolean; notes?: string }) {
    await this.service.adminVerifyProfile(body.userId, body.approved, body.notes);
    return { success: true };
  }
}
