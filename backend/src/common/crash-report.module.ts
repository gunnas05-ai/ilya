import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrashReport } from './crash-report.entity';
import { CrashReportController } from './crash-report.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CrashReport])],
  controllers: [CrashReportController],
})
export class CrashReportModule {}
