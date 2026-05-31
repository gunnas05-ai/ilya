import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { GibService } from './gib.service';
import { BlockchainService } from './blockchain.service';
import { InvoiceType, InvoiceStatus } from './invoice.entity';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

class AddCustomerDto {
  @IsString() name: string;
  @IsOptional() @IsString() taxNumber?: string;
  @IsOptional() @IsString() taxOffice?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
}

class UpdateCompanyDto {
  @IsOptional() @IsString() companyTitle?: string;
  @IsOptional() @IsString() taxNumber?: string;
  @IsOptional() @IsString() taxOffice?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
}

class CreateInvoiceDto {
  @IsEnum(InvoiceType) invoiceType: InvoiceType;
  @IsString() customerId: string;
  @IsNumber() @Min(0) totalAmount: number;
  @IsOptional() @IsNumber() vatAmount?: number;
  @IsOptional() items?: Array<{ name: string; quantity: number; unitPrice: number; vatRate?: number }>;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() loadId?: string;
}

@Controller('invoice')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class GibController {
  constructor(
    private gibService: GibService,
    private blockchain: BlockchainService,
  ) {}

  // ⚠️ STATIC routes MUST come before :id parameterized routes

  // ── Customer ───────────────────────────────────────────
  @Get('customer/frequent')
  async getFrequentCustomers(@Req() req: any) {
    return this.gibService.getFrequentCustomers(req.user.companyId || req.user.id);
  }

  @Post('customer/frequent')
  async addCustomer(@Body() body: AddCustomerDto, @Req() req: any) {
    return this.gibService.addCustomer({ ...body, companyId: req.user.companyId || req.user.id });
  }

  // ── Company Profile ────────────────────────────────────
  @Get('company/profile')
  async getCompanyProfile(@Req() req: any) {
    return this.gibService.getCompanyProfile(req.user.companyId || req.user.id);
  }

  @Put('company/profile')
  @Roles('admin', 'muhasebe')
  async updateCompanyProfile(@Body() body: UpdateCompanyDto, @Req() req: any) {
    return this.gibService.updateCompanyProfile(req.user.companyId || req.user.id, body);
  }

  @Get('company/profile/check')
  async checkCompanyProfile(@Req() req: any) {
    return this.gibService.checkCompanyProfile(req.user.companyId || req.user.id);
  }

  // ── EX-009: Accountant (static, before :id) ────────────
  @Get('accountant/pending')
  @Roles('muhasebe', 'admin')
  async getAccountantInvoices(
    @Query('status') status: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Req() req: any,
  ) {
    return this.gibService.getAccountantInvoices(req.user.id, { status, page, limit });
  }

  @Get('accountant/kdv-summary')
  @Roles('muhasebe', 'admin')
  async getAccountantKDVSummary(@Req() req: any) {
    return this.gibService.getAccountantKDVSummary(req.user.id);
  }

  // ── Document Downloads (static prefixes) ───────────────
  @Get('pdf/:id')
  async getPdf(@Param('id') id: string, @Res() res: any) {
    const buffer = await this.gibService.getPdf(id);
    const invoice = await this.gibService.findById(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNo}.pdf"`);
    res.send(buffer);
  }

  @Get('xml/:id')
  async getXml(@Param('id') id: string, @Res() res: any) {
    const result = await this.gibService.getXml(id);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.xmlContent);
  }

  @Get('qr/:id')
  async getQr(@Param('id') id: string) {
    return this.gibService.getQr(id);
  }

  // ── Invoice CRUD ───────────────────────────────────────
  @Post('create')
  @Roles('yuk_veren', 'tasiyici', 'isletme', 'muhasebe', 'admin', 'super_admin')
  async create(@Body() body: CreateInvoiceDto, @Req() req: any) {
    return this.gibService.createInvoice({ ...body, companyId: req.user.companyId || req.user.id });
  }

  @Get()
  async findAll(
    @Query('status') status: InvoiceStatus,
    @Query('invoiceType') invoiceType: InvoiceType,
    @Query('page') page: number, @Query('limit') limit: number,
    @Query('dateFrom') dateFrom: string, @Query('dateTo') dateTo: string,
    @Query('search') search: string, @Req() req: any,
  ) {
    return this.gibService.findAll({ companyId: req.user.companyId || req.user.id, status, invoiceType, page, limit, dateFrom, dateTo, search });
  }

  // ⚠️ :id parameterized routes BELOW all static routes
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.gibService.findById(id);
  }

  // ── Workflow ───────────────────────────────────────────
  @Post(':id/preview')
  async preview(@Param('id') id: string) { return this.gibService.preview(id); }

  @Post(':id/approve')
  @Roles('admin', 'muhasebe')
  async approve(@Param('id') id: string, @Req() req: any) { return this.gibService.approve(id, req.user.id); }

  @Post(':id/send-gib')
  @Roles('admin', 'muhasebe')
  async sendToGib(@Param('id') id: string, @Req() req: any) { return this.gibService.sendToGib(id, req.user.id); }

  @Post(':id/cancel')
  @Roles('admin', 'muhasebe')
  async cancel(@Param('id') id: string, @Req() req: any) { return this.gibService.cancel(id, req.user.id); }

  @Post(':id/issue-cancel')
  @Roles('admin', 'muhasebe')
  async issueCancelInvoice(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.gibService.issueCancelInvoice(id, req.user.id, body.reason);
  }

  @Post(':id/archive')
  @Roles('admin', 'muhasebe')
  async archive(@Param('id') id: string, @Req() req: any) { return this.gibService.archive(id, req.user.id); }

  @Post(':id/send-accountant')
  async sendToAccountant(@Param('id') id: string, @Body() body: { accountantEmail?: string }) {
    return this.gibService.sendToAccountant(id, body?.accountantEmail);
  }

  @Get(':id/logs')
  async getLogs(@Param('id') id: string) { return this.gibService.getLogs(id); }

  @Get(':id/submission-status')
  async getSubmissionStatus(@Param('id') id: string) { return this.gibService.getSubmissionStatus(id); }

  // ── EX-025: Blockchain Verification ─────────────────

  @Get(':id/verify-blockchain')
  async verifyBlockchain(@Param('id') id: string) {
    return this.blockchain.verifyDocument(id);
  }

  @Post(':id/anchor-blockchain')
  @Roles('admin', 'super_admin')
  async anchorToBlockchain(@Param('id') id: string) {
    const invoice = await this.gibService.findById(id);
    return this.blockchain.anchorInvoice(id, invoice);
  }

  @Get('blockchain/info')
  async getBlockchainInfo() {
    return this.blockchain.getChainInfo();
  }
}
