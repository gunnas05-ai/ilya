import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartListing } from './entities/part-listing.entity';
import { PartCategory, PartPhoto, PartOffer, PartFavorite, PartTransaction, PartReview, PartDispute, PartBoost, PartCommissionConfig } from './entities/part-entities';
import { PartMarketController } from './part-market.controller';
import { PartMarketService } from './part-market.service';

@Module({
  imports: [TypeOrmModule.forFeature([PartListing, PartCategory, PartPhoto, PartOffer, PartFavorite, PartTransaction, PartReview, PartDispute, PartBoost, PartCommissionConfig])],
  controllers: [PartMarketController],
  providers: [PartMarketService],
  exports: [PartMarketService],
})
export class PartMarketModule {}
