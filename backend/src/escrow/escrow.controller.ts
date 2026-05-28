import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, Query, UseInterceptors, UploadedFile, Headers, Ip } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { EscrowService } from './escrow.service';
import { WalletService } from './wallet.service';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalType } from './withdrawal-request.entity';
import { DisputeEvidenceService } from './dispute-evidence.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { InsuranceService } from './insurance.service';

import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

@Controller('escrow')
@UseGuards(AuthGuard('jwt'))
export class EscrowController {
  constructor(
    private escrowService: EscrowService,
    private walletService: WalletService,
    private withdrawalService: WithdrawalService,
    private disputeEvidenceService: DisputeEvidenceService,
    private gatewayService: PaymentGatewayService,
    private insuranceService: InsuranceService,
    
  ) {}

  @Post('create')
  @UseGuards(RolesGuard)
  @Roles('yuk_veren', 'marketplace_satici', 'filo_yoneticisi', 'platform_operatoru', 'admin', 'super_admin')
  async create(@Body() body: any, @Req() req: any) {
    return this.escrowService.createEscrow({
      loadId: body.loadId,
      shipperId: req.user.id,
      carrierId: body.carrierId,
      amount: body.amount,
      isMilestone: body.isMilestone,
      totalMilestones: body.totalMilestones,
      milestonePercentages: body.milestonePercentages,
      milestoneTimeoutHours: body.milestoneTimeoutHours,
      idempotencyKey: body.idempotencyKey,
    });
  }

  @Post('auto-refund-expired')
  async autoRefundExpired() {
    return this.escrowService.autoRefundExpiredMilestones();
  }

  @Post(':id/release')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'dispute_moderator', 'yuk_veren', 'platform_operatoru')
  async release(@Param('id') id: string, @Body() body: any) {
    return this.escrowService.releasePayment(id, body.verificationData);
  }

  @Post(':id/dispute')
  @UseGuards(RolesGuard)
  @Roles('yuk_veren', 'tasiyici', 'marketplace_satici', 'marketplace_alici', 'admin', 'super_admin')
  async openDispute(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.escrowService.openDispute(id, req.user.id, body.reason, body.description, body.evidence);
  }

  @Post('disputes/:id/resolve')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'dispute_moderator')
  async resolveDispute(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.escrowService.resolveDispute(id, req.user.id, body.resolution, body.resolutionType, body.refundAmount);
  }

  @Get('status/:loadId')
  async getStatus(@Param('loadId') loadId: string) {
    return this.escrowService.getEscrowStatus(loadId);
  }

  // --- Wallet ---

  @Get('wallet')
  async getWallet(@Req() req: any) {
    return this.walletService.getBalance(req.user.id);
  }

  @Get('wallet/transactions')
  async getTransactions(@Req() req: any) {
    return this.walletService.getTransactions(req.user.id);
  }

  @Post('wallet/deposit')
  async deposit(@Body() body: any, @Req() req: any) {
    return this.walletService.credit(req.user.id, body.amount, `deposit_${Date.now()}`, 'Para yükleme');
  }

  @Post('wallet/iban')
  async saveIban(@Body() body: any, @Req() req: any) {
    return this.withdrawalService.saveIban(req.user.id, body.iban, body.bankName, body.accountHolderName);
  }

  @Get('wallet/iban')
  async getIban(@Req() req: any) {
    return this.withdrawalService.getIban(req.user.id);
  }

  // --- Withdrawals ---

  @Post('withdraw')
  async withdraw(@Body() body: any, @Req() req: any) {
    return this.withdrawalService.requestWithdrawal(
      req.user.id,
      body.amount,
      WithdrawalType.STANDARD,
      { iban: body.iban, bankName: body.bankName, accountHolderName: body.accountHolderName },
      undefined,
      body.description,
    );
  }

  @Post('withdraw/iban')
  async withdrawIban(@Body() body: any, @Req() req: any) {
    return this.withdrawalService.requestIbanTransfer(
      req.user.id, body.amount, body.iban, body.bankName, body.accountHolderName,
    );
  }

  @Post('withdraw/fuel-advance')
  async fuelAdvance(@Body() body: any, @Req() req: any) {
    return this.withdrawalService.fuelAdvance(req.user.id, body.amount, body.loadId);
  }

  @Post('withdraw/milestone-payout')
  async milestonePayout(@Body() body: any, @Req() req: any) {
    return this.withdrawalService.milestonePayout(req.user.id, body.amount, body.milestoneId);
  }

  @Post('withdraw/cashback')
  async cashback(@Body() body: any, @Req() req: any) {
    return this.withdrawalService.cashback(req.user.id, body.amount, body.referenceId);
  }

  @Get('withdraw/history')
  async withdrawalHistory(@Req() req: any) {
    return this.withdrawalService.getWithdrawalHistory(req.user.id);
  }

  // --- Dispute Evidence ---

  @Post('disputes/:id/evidence')
  @UseGuards(RolesGuard)
  @Roles('yuk_veren', 'tasiyici', 'sofor', 'marketplace_satici', 'marketplace_alici', 'admin', 'super_admin')
  @UseInterceptors(FileInterceptor('file'))
  async uploadEvidence(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return this.disputeEvidenceService.uploadEvidence(id, req.user.id, file);
  }

  @Get('disputes/:id/evidence')
  async getEvidence(@Param('id') id: string) {
    return this.disputeEvidenceService.getEvidenceForDispute(id);
  }

  @Delete('evidence/:id')
  async deleteEvidence(@Param('id') id: string, @Req() req: any) {
    return this.disputeEvidenceService.deleteEvidence(id, req.user.id);
  }

  // --- Fraud Review ---

  @Get('admin/fraud-review')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'dispute_moderator')
  async flaggedForReview() {
    return this.escrowService.getFlaggedForReview();
  }

  @Post('admin/fraud-review/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'dispute_moderator')
  async reviewFraud(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.escrowService.reviewFraudCase(id, req.user.id, body.decision, body.note);
  }

  // --- Admin endpoints ---

  @Get('admin/withdrawals/pending')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'dispute_moderator')
  async pendingWithdrawals() {
    return this.withdrawalService.getPendingWithdrawals();
  }

  @Post('admin/withdrawals/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  async approveWithdrawal(@Param('id') id: string, @Req() req: any) {
    return this.withdrawalService.approveWithdrawal(id, req.user.id);
  }

  @Post('admin/withdrawals/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  async rejectWithdrawal(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.withdrawalService.rejectWithdrawal(id, req.user.id, body.reason);
  }

  @Post('admin/withdrawals/:id/complete')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  async completeWithdrawal(@Param('id') id: string, @Req() req: any) {
    return this.withdrawalService.completeWithdrawal(id, req.user.id);
  }

  // ─── EX-023: Insurance Endpoints ───

  @Get('insurance/packages')
  async getInsurancePackages() {
    return this.insuranceService.getAvailablePackages();
  }

  @Post('insurance/issue')
  async issuePolicy(@Body() body: { loadId: string; packageId: string }, @Req() req: any) {
    return this.insuranceService.issuePolicy(body.loadId, req.user.id, body.packageId);
  }

  @Get('insurance/policies')
  async getMyPolicies(@Req() req: any) {
    return this.insuranceService.getUserPolicies(req.user.id);
  }

  @Get('insurance/policy/:loadId')
  async getPolicyForLoad(@Param('loadId') loadId: string) {
    return this.insuranceService.getPolicyByLoad(loadId);
  }

  @Post('insurance/claim')
  async fileClaim(@Body() body: { policyId: string; claimAmount: number; description: string }, @Req() req: any) {
    return this.insuranceService.fileClaim(body.policyId, req.user.id, body.claimAmount, body.description);
  }

  // ─── EX-004: Payment Gateway Endpoints ───

  @Get('gateway/info')
  async getGatewayInfo() {
    return this.gatewayService.getProviderInfo();
  }

  @Post('gateway/deposit')
  async gatewayDeposit(@Body() body: any, @Req() req: any) {
    return this.gatewayService.deposit(req.user.id, body.amount, body.returnUrl);
  }

  @Post('gateway/withdraw')
  async gatewayWithdraw(@Body() body: any, @Req() req: any) {
    return this.gatewayService.withdraw(
      req.user.id,
      body.amount,
      body.iban,
      body.bankName || 'Banka',
      body.accountHolderName,
    );
  }

  @Get('gateway/stats')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  async getGatewayStats() {
    return this.gatewayService.getGatewayStats();
  }

  /** EX-004: Webhook receiver (no auth — signed by provider) */
  @Post('gateway/webhook/:providerCode')
  async handleWebhook(
    @Param('providerCode') providerCode: string,
    @Headers('x-webhook-signature') signature: string,
    @Body() payload: any,
    @Query('event') event?: string,
  ) {
    return this.gatewayService.handleProviderWebhook(
      providerCode,
      event || payload?.event || 'unknown',
      payload,
      signature || '',
    );
  }
}
