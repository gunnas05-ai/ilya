import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from './listing.entity';
import { ListingCategory } from './listing-category.entity';
import { VehicleDetail } from './vehicle-detail.entity';
import { ListingOffer } from './listing-offer.entity';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Listing, ListingCategory, VehicleDetail, ListingOffer])],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
