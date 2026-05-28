import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  IPaymentProvider, CardInfo, RegisterCardResult,
  PaymentRequest, PaymentResult,
} from './payment-provider.interface';

@Injectable()
export class IyzicoProvider implements IPaymentProvider {
  readonly providerName = 'iyzico';
  private readonly logger = new Logger(IyzicoProvider.name);

  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.IYZICO_API_KEY || 'sandbox-api-key';
    this.secretKey = process.env.IYZICO_SECRET_KEY || 'sandbox-secret-key';
    this.baseUrl = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com';
  }

  private getAuthHeaders(): Record<string, string> {
    const randomStr = `${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    const hash = createHash('sha256')
      .update(`${this.apiKey}${randomStr}${this.secretKey}`)
      .digest('base64');

    return {
      'Authorization': `IYZWSv2 ${hash}`,
      'x-iyzi-rnd': randomStr,
      'Content-Type': 'application/json',
    };
  }

  async registerCard(card: CardInfo, userId: string): Promise<RegisterCardResult> {
    try {
      const body = {
        locale: 'tr',
        conversationId: `card-${userId}-${Date.now()}`,
        email: `${userId}@kaptan.user`,
        externalId: userId,
        card: {
          cardAlias: `Kaptan Kart ${card.cardNumber.slice(-4)}`,
          cardHolderName: card.cardHolderName,
          cardNumber: card.cardNumber.replace(/\s/g, ''),
          expireMonth: card.expiryMonth,
          expireYear: card.expiryYear,
        },
      };

      this.logger.log(`İyzico kart kaydi: ${userId} (${card.cardNumber.slice(-4)})`);

      const response = await fetch(`${this.baseUrl}/cardstorage/card`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.status === 'success') {
        return {
          success: true,
          cardToken: result.cardToken || result.card?.cardToken,
          last4: result.lastFourDigits || result.card?.lastFourDigits || card.cardNumber.slice(-4),
          brand: result.binNumber ? this.mapBrand(result.cardAssociation || result.card?.cardAssociation) : this.mapBrand(''),
          cardHolderName: card.cardHolderName,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
        };
      }

      return {
        success: false,
        cardToken: '',
        last4: card.cardNumber.slice(-4),
        brand: '',
        cardHolderName: card.cardHolderName,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        errorMessage: result.errorMessage || 'Kart kaydedilemedi',
      };
    } catch (err: any) {
      this.logger.error(`İyzico kart kayit hatasi: ${err.message}`);
      return {
        success: false,
        cardToken: '',
        last4: card.cardNumber.slice(-4),
        brand: '',
        cardHolderName: card.cardHolderName,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        errorMessage: 'Ödeme sağlayıcıya bağlanılamadı',
      };
    }
  }

  async charge(request: PaymentRequest): Promise<PaymentResult> {
    try {
      const body = {
        locale: 'tr',
        conversationId: `pay-${request.idempotencyKey}`,
        price: String((request.amount / 100).toFixed(1)), // Kuruş → TL string
        paidPrice: String((request.amount / 100).toFixed(1)),
        currency: request.currency || 'TRY',
        installment: '1',
        basketId: `BASKET-${request.idempotencyKey}`,
        paymentChannel: 'WEB',
        paymentGroup: 'PRODUCT',
        paymentCard: {
          cardToken: request.cardToken,
          cardHolderName: '',
          registerCard: '0',
        },
        buyer: {
          id: 'BUYER-1',
          name: 'KAPTAN',
          surname: 'User',
          gsmNumber: '+905350000000',
          email: 'user@kaptan.app',
          identityNumber: '11111111111',
          registrationAddress: 'İstanbul',
          ip: '127.0.0.1',
          city: 'İstanbul',
          country: 'Turkey',
        },
        shippingAddress: {
          contactName: 'KAPTAN User',
          city: 'İstanbul',
          country: 'Turkey',
          address: 'KAPTAN Platform',
        },
        billingAddress: {
          contactName: 'KAPTAN User',
          city: 'İstanbul',
          country: 'Turkey',
          address: 'KAPTAN Platform',
        },
        basketItems: [{
          id: `ITEM-${request.idempotencyKey}`,
          name: request.description,
          category1: 'Digital Services',
          itemType: 'VIRTUAL',
          price: String((request.amount / 100).toFixed(1)),
        }],
      };

      this.logger.log(`İyzico odeme: ${request.amount} kurus, ${request.description}`);

      const response = await fetch(`${this.baseUrl}/payment/auth`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.status === 'success') {
        return {
          success: true,
          providerRef: result.paymentId || result.payment?.paymentId || `iyz-${Date.now()}`,
          status: 'success',
        };
      }

      return {
        success: false,
        providerRef: '',
        status: 'failed',
        errorMessage: result.errorMessage || 'Ödeme başarısız',
        errorCode: result.errorCode,
      };
    } catch (err: any) {
      this.logger.error(`İyzico odeme hatasi: ${err.message}`);
      return {
        success: false,
        providerRef: '',
        status: 'failed',
        errorMessage: 'Ödeme sağlayıcıya bağlanılamadı',
      };
    }
  }

  async refund(providerRef: string, amount: number): Promise<PaymentResult> {
    try {
      const body = {
        locale: 'tr',
        conversationId: `refund-${providerRef}-${Date.now()}`,
        paymentTransactionId: providerRef,
        price: String((amount / 100).toFixed(1)),
        currency: 'TRY',
      };

      const response = await fetch(`${this.baseUrl}/payment/refund`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(body),
      });

      const result = await response.json();
      return {
        success: result.status === 'success',
        providerRef: result.paymentId || providerRef,
        status: result.status === 'success' ? 'success' : 'failed',
        errorMessage: result.errorMessage,
      };
    } catch (err: any) {
      return {
        success: false,
        providerRef,
        status: 'failed',
        errorMessage: err.message,
      };
    }
  }

  async getPaymentStatus(providerRef: string): Promise<PaymentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/payment/detail`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          locale: 'tr',
          conversationId: `status-${providerRef}-${Date.now()}`,
          paymentId: providerRef,
        }),
      });

      const result = await response.json();
      return {
        success: true,
        providerRef,
        status: result.status === 'success' ? 'success' : 'failed',
        errorMessage: result.errorMessage,
      };
    } catch (err: any) {
      return { success: false, providerRef, status: 'failed', errorMessage: err.message };
    }
  }

  private mapBrand(association: string): string {
    const map: Record<string, string> = {
      VISA: 'visa',
      MASTER_CARD: 'mastercard',
      AMERICAN_EXPRESS: 'amex',
      TROY: 'troy',
    };
    return map[association?.toUpperCase()] || 'visa';
  }
}
