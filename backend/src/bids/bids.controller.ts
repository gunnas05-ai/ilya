import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BidsService } from './bids.service';

@Controller('bids')
@UseGuards(AuthGuard('jwt'))
export class BidsController {
  constructor(private bidsService: BidsService) {}

  @Post()
  async placeBid(@Body() body: any, @Req() req: any) {
    return this.bidsService.placeBid({
      loadId: body.loadId,
      carrierId: req.user.id,
      carrierName: req.user.fullName,
      amount: body.amount,
      note: body.note,
      estimatedDeliveryDays: body.estimatedDeliveryDays || 3,
      hasReturnLoad: body.hasReturnLoad || false,
      pickupTime: body.pickupTime,
      requestEscrow: body.requestEscrow,
      validDuration: body.validDuration || 1440,
    });
  }

  @Get('my')
  async getMyBids(@Req() req: any) {
    return this.bidsService.getMyBids(req.user.id);
  }

  @Get('load/:loadId')
  async getBidsForLoad(@Param('loadId') loadId: string) {
    return this.bidsService.getBidsForLoad(loadId);
  }

  @Put(':id/accept')
  async acceptBid(@Param('id') id: string, @Req() req: any) {
    return this.bidsService.acceptBid(id, req.user.id);
  }

  @Put(':id/reject')
  async rejectBid(@Param('id') id: string, @Req() req: any) {
    return this.bidsService.rejectBid(id, req.user.id);
  }

  @Put(':id/counter')
  async counterBid(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.bidsService.counterBid(id, req.user.id, body.counterAmount, body.counterNote || '');
  }

  @Put(':id/accept-counter')
  async acceptCounter(@Param('id') id: string, @Req() req: any) {
    return this.bidsService.acceptCounter(id, req.user.id);
  }

  @Put(':id/cancel')
  async cancelBid(@Param('id') id: string, @Req() req: any) {
    return this.bidsService.cancelBid(id, req.user.id);
  }
}
