import { Controller, Get, Post, Body, Query, Param, UseGuards, Request, UploadedFile, UseInterceptors, ParseFilePipeBuilder, HttpStatus } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { OcrService } from './ocr.service';
import { OcrDocumentType } from './ocr-document.entity';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerGuard } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('finance')
@UseGuards(AuthGuard('jwt'), ThrottlerGuard)
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly ocrService: OcrService
  ) {}

  @Get('incomes')
  getIncomes(@Request() req: any) {
    return this.financeService.getIncomes(req.user.id);
  }

  @Post('incomes')
  createIncome(@Request() req: any, @Body() body: any) {
    return this.financeService.createIncome(body, req.user.id);
  }

  @Get('expenses')
  getExpenses(@Request() req: any) {
    return this.financeService.getExpenses(req.user.id);
  }

  @Post('expenses')
  createExpense(@Request() req: any, @Body() body: any) {
    return this.financeService.createExpense(body, req.user.id);
  }

  @Get('profit-loss')
  getProfitLoss(
    @Request() req: any, 
    @Query('start_date') startDate?: string, 
    @Query('end_date') endDate?: string,
    @Query('vehicle_id') vehicleId?: string
  ) {
    return this.financeService.getProfitLoss(req.user.id, startDate, endDate, vehicleId);
  }

  @Post('ocr/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadOcrReceipt(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    ) file: any,
    @Body() body: { fileUrl?: string },
    @Request() req: any,
  ) {
    const fileUrl = body.fileUrl || `https://storage.kaptan.com/receipts/${file.originalname}`;
    return this.ocrService.processUpload(fileUrl, file.mimetype, OcrDocumentType.RECEIPT, req.user.id);
  }

  /** EX-017: Rate confirmation OCR — extracts price, lane, shipper, carrier from PDF */
  @Post('ocr/rate-confirmation')
  @UseInterceptors(FileInterceptor('file'))
  uploadRateConfirmation(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp|pdf)$/ })
        .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    ) file: any,
    @Body() body: { fileUrl?: string },
    @Request() req: any,
  ) {
    const fileUrl = body.fileUrl || `https://storage.kaptan.com/rate-confirmations/${file.originalname}`;
    return this.ocrService.processRateConfirmation(fileUrl, file.mimetype, req.user.id);
  }

  /** EX-017: Driver license OCR — extracts TC no, license no, expiry, name */
  @Post('ocr/driver-license')
  @UseInterceptors(FileInterceptor('file'))
  uploadDriverLicense(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    ) file: any,
    @Body() body: { fileUrl?: string },
    @Request() req: any,
  ) {
    const fileUrl = body.fileUrl || `https://storage.kaptan.com/licenses/${file.originalname}`;
    return this.ocrService.processDriverLicense(fileUrl, file.mimetype, req.user.id);
  }

  /** EX-017: SRC document OCR — extracts SRC no, holder name, expiry */
  @Post('ocr/src-document')
  @UseInterceptors(FileInterceptor('file'))
  uploadSrcDocument(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    ) file: any,
    @Body() body: { fileUrl?: string },
    @Request() req: any,
  ) {
    const fileUrl = body.fileUrl || `https://storage.kaptan.com/src/${file.originalname}`;
    return this.ocrService.processSrcDocument(fileUrl, file.mimetype, req.user.id);
  }

  /** EX-017: Poll OCR result by document ID */
  @Get('ocr/:id/result')
  getOcrResult(@Param('id') id: string) {
    return this.ocrService.getResult(id);
  }

  @Get('vehicles/:id/expenses')
  getVehicleExpenses(@Request() req: any, @Param('id') vehicleId: string) {
    return this.financeService.getVehicleExpenses(req.user.id, vehicleId);
  }

  @Get('vehicles/:id/incomes')
  getVehicleIncomes(@Request() req: any, @Param('id') vehicleId: string) {
    return this.financeService.getVehicleIncomes(req.user.id, vehicleId);
  }

  @Get('dashboard')
  getDashboard(@Request() req: any) {
    return this.financeService.getDashboardSummary(req.user.id);
  }

  @Get('vehicles/:id/summary')
  getVehicleSummary(@Request() req: any, @Param('id') vehicleId: string) {
    return this.financeService.getVehicleSummary(req.user.id, vehicleId);
  }

  @Get('reminders/upcoming')
  getUpcomingReminders(@Request() req: any) {
    return this.financeService.getUpcomingReminders(req.user.id);
  }

  @Post('invites')
  createInvite(@Request() req: any, @Body() body: { role: string, vehicleId?: string }) {
    return this.financeService.generateInvite(req.user.id, body.role, body.vehicleId);
  }

  @Post('invites/accept')
  acceptInvite(@Request() req: any, @Body() body: { code: string }) {
    return this.financeService.acceptInvite(req.user.id, body.code);
  }
}
