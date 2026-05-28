import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, code: string = 'BUSINESS_ERROR', status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ message, code, statusCode: status }, status);
  }
}

export class InsufficientFundsException extends BusinessException {
  constructor() {
    super('Yetersiz bakiye', 'INSUFFICIENT_FUNDS', HttpStatus.PAYMENT_REQUIRED);
  }
}

export class EscrowStateException extends BusinessException {
  constructor(message: string) {
    super(message, 'ESCROW_STATE_ERROR', HttpStatus.CONFLICT);
  }
}
