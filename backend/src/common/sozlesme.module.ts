import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from './system-setting.entity';
import { SozlesmeController } from './sozlesme.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting])],
  controllers: [SozlesmeController],
})
export class SozlesmeModule {}
