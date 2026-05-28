import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { IyzicoProvider } from './providers/iyzico.provider';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentMethod, PaymentTransaction])],
  controllers: [PaymentController],
  providers: [PaymentService, IyzicoProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
