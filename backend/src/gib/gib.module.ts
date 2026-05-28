import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { InvoiceLog } from './invoice-log.entity';
import { Customer } from './customer.entity';
import { Company } from './company.entity';
import { GibSubmission } from './gib-submission.entity';
import { XmlDocument } from './xml-document.entity';
import { GibController } from './gib.controller';
import { GibService } from './gib.service';
import { GibApiService } from './gib-api.service';
import { EmailService } from './email.service';
import { InvoiceProcessor } from './invoice.processor';
import { BlockchainAnchor } from './blockchain-anchor.entity';
import { BlockchainService } from './blockchain.service';
import { User } from '../users/user.entity';
import { Load } from '../loads/load.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceItem, InvoiceLog, Customer, Company, GibSubmission, XmlDocument, BlockchainAnchor, User, Load]),
  ],
  controllers: [GibController],
  providers: [GibService, GibApiService, EmailService, InvoiceProcessor, BlockchainService],
  exports: [GibService],
})
export class GibModule {}
