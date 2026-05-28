import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RateApiService } from './rate-api.service';

@ApiTags('rate-api')
@Controller({ path: 'rates', version: '1' })
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class RateApiController {
  constructor(private readonly service: RateApiService) {}

  @Post('quote')
  @ApiOperation({ summary: 'Tekil fiyat sorgusu' })
  async quote(@Body() body: any) {
    return this.service.getQuote(body);
  }

  @Post('quote/batch')
  @ApiOperation({ summary: 'Toplu fiyat sorgusu (max 50)' })
  async quoteBatch(@Body() body: { requests: any[] }) {
    return this.service.getQuoteBatch(body.requests || []);
  }

  @Get('agreements')
  @ApiOperation({ summary: 'Sozlesmeli tarifeleri listele' })
  async agreements(@Req() req: any) {
    return this.service.getAgreements(req.user.id);
  }
}
