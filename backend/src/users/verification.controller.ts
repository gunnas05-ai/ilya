import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VerificationService } from './verification.service';

@Controller('v1/users/verification')
@UseGuards(AuthGuard('jwt'))
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('identity')
  async verifyIdentity(
    @Request() req: any,
    @Body() body: { tcKimlikNo: string; firstName: string; lastName: string; birthYear: number }
  ) {
    const updatedUser = await this.verificationService.verifyIdentity(
      req.user.id,
      body.tcKimlikNo,
      body.firstName,
      body.lastName,
      body.birthYear
    );
    return {
      success: true,
      message: 'Kimlik doğrulama başarılı',
      data: updatedUser
    };
  }

  @Post('carrier-docs')
  async verifyCarrierDocs(
    @Request() req: any,
    @Body() body: { plateNumber?: string; srcBelgeNo?: string; kBelgesiNo?: string }
  ) {
    const updatedUser = await this.verificationService.verifyCarrierDocs(
      req.user.id,
      body.plateNumber,
      body.srcBelgeNo,
      body.kBelgesiNo
    );
    return {
      success: true,
      message: 'Belge doğrulama başarılı',
      data: updatedUser
    };
  }
}
