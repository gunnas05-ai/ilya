import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UetdsTransaction } from './uetds-transaction.entity';

@Controller('uetds')
export class UetdsController {
  constructor(
    @InjectRepository(UetdsTransaction)
    private uetdsRepo: Repository<UetdsTransaction>,
  ) {}

  @Get('transactions')
  @UseGuards(AuthGuard('jwt'))
  async getTransactions(
    @Query('status') status?: string,
    @Query('loadId') loadId?: string,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (loadId) where.loadId = loadId;

    return this.uetdsRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  @Get('transactions/:id')
  @UseGuards(AuthGuard('jwt'))
  async getTransaction(@Param('id') id: string) {
    return this.uetdsRepo.findOne({ where: { id } });
  }
}
