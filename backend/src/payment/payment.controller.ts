import {
  Controller, Post, Get, Delete, Param, Body, Req, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentService } from './payment.service';

@ApiTags('payment')
@Controller({ path: 'payment', version: '1' })
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('card/register')
  @ApiOperation({ summary: 'Ödeme sağlayıcıdan alınan kart tokenini kaydet (PCI-DSS uyumlu: ham kart verisi backendden geçmez)' })
  async registerCard(
    @Req() req: any,
    @Body() body: {
      /** Ödeme sağlayıcının JS SDK'sı üzerinden alınan kart tokeni */
      cardToken: string;
      /** Son 4 hane (gösterim için) */
      last4: string;
      /** Kart markası (visa, mastercard vb.) */
      brand: string;
      /** Kart üzerindeki isim */
      cardHolderName: string;
      /** Son kullanma ayı (MM) */
      expiryMonth: string;
      /** Son kullanma yılı (YYYY) */
      expiryYear: string;
    },
  ) {
    if (!body.cardToken || !body.last4 || !body.expiryMonth || !body.expiryYear) {
      throw new Error('Eksik kart bilgisi: cardToken, last4, expiryMonth, expiryYear zorunludur');
    }
    return this.paymentService.registerCardWithToken(req.user.id, {
      cardToken: body.cardToken,
      last4: body.last4,
      brand: body.brand || 'unknown',
      cardHolderName: body.cardHolderName || '',
      expiryMonth: body.expiryMonth,
      expiryYear: body.expiryYear,
    });
  }

  @Get('card/list')
  @ApiOperation({ summary: 'Kayitli kartlari listele (son 4 hane + marka)' })
  async listCards(@Req() req: any) {
    return this.paymentService.listCards(req.user.id);
  }

  @Delete('card/:id')
  @ApiOperation({ summary: 'Kayitli karti sil' })
  async deleteCard(@Req() req: any, @Param('id') id: string) {
    await this.paymentService.deleteCard(req.user.id, id);
    return { success: true };
  }

  @Post('charge')
  @ApiOperation({ summary: 'Kayitli kart ile odeme yap' })
  async charge(
    @Req() req: any,
    @Body() body: {
      paymentMethodId: string;
      amount: number;        // Kuruş cinsinden (199.00 TL = 19900)
      description: string;
      type: string;          // 'subscription', 'credits', 'escrow_deposit', 'insurance'
      referenceId?: string;
      referenceType?: string;
    },
  ) {
    return this.paymentService.charge(
      req.user.id,
      body.paymentMethodId,
      body.amount,
      body.description,
      body.type,
      body.referenceId,
      body.referenceType,
    );
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Odeme islem gecmisi' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async getTransactions(
    @Req() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.paymentService.getTransactions(req.user.id, limit || 20, offset || 0);
  }
}
