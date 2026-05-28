import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomsDeclaration, CustomsDocument } from './entities/customs-declaration.entity';
import { CustomsController } from './customs.controller';
import { CustomsService } from './customs.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomsDeclaration, CustomsDocument])],
  controllers: [CustomsController],
  providers: [CustomsService],
  exports: [CustomsService],
})
export class CustomsModule {}
