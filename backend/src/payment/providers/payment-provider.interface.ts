/** Payment Provider arayüzü — İyzico, Stripe vb. için plugin mimari */

/** PCI-DSS uyumsuz — sadece provider JS SDK ile kullanım içindir, backend'de KULLANILMAZ */
export interface CardInfo {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  cardHolderName: string;
}

/** PCI-DSS uyumlu — backend'e sadece token iletilir */
export interface CardTokenInfo {
  cardToken: string;
  last4: string;
  brand: string;
  cardHolderName: string;
  expiryMonth: string;
  expiryYear: string;
}

export interface RegisterCardResult {
  success: boolean;
  cardToken: string;
  last4: string;
  brand: string;
  cardHolderName: string;
  expiryMonth: string;
  expiryYear: string;
  errorMessage?: string;
}

export interface PaymentRequest {
  cardToken: string;
  amount: number;         // Kurus cinsinden (örn: 19900 = 199.00 TL)
  currency?: string;
  description: string;
  idempotencyKey: string;
}

export interface PaymentResult {
  success: boolean;
  providerRef: string;    // Provider referans numarası
  status: 'success' | 'failed';
  errorMessage?: string;
  errorCode?: string;
}

export interface IPaymentProvider {
  readonly providerName: string;

  /** Kartı tokenize et (PCI-DSS: kart verisi platforma girmez) */
  registerCard(card: CardInfo, userId: string): Promise<RegisterCardResult>;

  /** Token ile ödeme al */
  charge(request: PaymentRequest): Promise<PaymentResult>;

  /** İade yap */
  refund(providerRef: string, amount: number): Promise<PaymentResult>;

  /** Ödeme durumunu sorgula */
  getPaymentStatus(providerRef: string): Promise<PaymentResult>;
}
