import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Income } from './income.entity';
import { Expense } from './expense.entity';
import { ExpenseCategory } from './expense-category.entity';
import { OcrDocument } from './ocr-document.entity';
import { ShipmentDocument } from './shipment-document.entity';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { FinanceReminder } from './finance-reminder.entity';
import { RecurringIncomeTemplate } from './recurring-income-template.entity';
import { FinanceInvite } from './finance-invite.entity';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { OcrService } from './ocr.service';
import { EscrowModule } from '../escrow/escrow.module';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      Income, Expense, ExpenseCategory, ShipmentDocument, OcrDocument,
      FinanceReminder, RecurringIncomeTemplate, FinanceInvite
    ]),
    EscrowModule,
  ],
  controllers: [FinanceController, DocumentController],
  providers: [FinanceService, OcrService, DocumentService],
  exports: [FinanceService, DocumentService]
})
export class FinanceModule {}
