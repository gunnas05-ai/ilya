import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './restaurant.entity';
import { RestaurantImage } from './restaurant-image.entity';
import { Menu } from './menu.entity';
import { MenuItem } from './menu-item.entity';
import { RestaurantReview } from './restaurant-review.entity';
import { ReviewReply } from './review-reply.entity';
import { RestaurantFavorite } from './restaurant-favorite.entity';
import { RestaurantReservation, RestaurantTable, RestaurantCapacityConfig } from './reservation.entity';
import { MenuItemReview } from './menu-item-review.entity';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Restaurant, RestaurantImage, Menu, MenuItem, RestaurantReview,
      ReviewReply, RestaurantFavorite, RestaurantReservation, MenuItemReview,
      RestaurantTable, RestaurantCapacityConfig,
    ]),
  ],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
