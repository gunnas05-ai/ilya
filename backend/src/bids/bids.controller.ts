import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { IsNumber, IsString, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { BidsService } from './bids.service';

class PlaceBidDto {
  @IsString() loadId: string;
  @IsNumber() @Min(1) amount: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsNumber() @Min(1) @Max(30) estimatedDeliveryDays?: number;
  @IsOptional() @IsBoolean() hasReturnLoad?: boolean;
  @IsOptional() @IsString() pickupTime?: string;
  @IsOptional() @IsBoolean() requestEscrow?: boolean;
  @IsOptional() @IsNumber() @Min(60) validDuration?: number;
}

class CounterBidDto {
  @IsNumber() @Min(1) counterAmount: number;
  @IsOptional() @IsString() counterNote?: string;
}

@Controller('bids')
@UseGuards(AuthGuard('jwt'))
export class BidsController {
  constructor(private bidsService: BidsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async placeBid(@Body() body: PlaceBidDto, @Req() req: any) {
    return this.bidsService.placeBid({ ...body, carrierId: req.user.id, carrierName: req.user.fullName });
  }

  @Put(':id/accept')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async acceptBid(@Param('id') id: string, @Req() req: any) {
    return this.bidsService.acceptBid(id, req.user.id);
  }

  @Get('my')
  async getMyBids(@Req() req: any) {
    return this.bidsService.getMyBids(req.user.id);
  }

  @Get('load/:loadId')
  async getBidsForLoad(@Param('loadId') loadId: string) {
    return this.bidsService.getBidsForLoad(loadId);
  }

  @Put(':id/reject')
  async rejectBid(@Param('id') id: string, @Req() req: any) {
    return this.bidsService.rejectBid(id, req.user.id);
  }

  @Put(':id/counter')
  async counterBid(@Param('id') id: string, @Body() body: CounterBidDto, @Req() req: any) {
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
