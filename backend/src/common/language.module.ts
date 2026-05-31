import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from './system-setting.entity';
import { RolesGuard } from './roles.guard';
import { LanguageService } from './language.service';
import { LanguageController } from './language.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting])],
  controllers: [LanguageController],
  providers: [LanguageService, RolesGuard],
  exports: [LanguageService],
})
export class LanguageModule {}
