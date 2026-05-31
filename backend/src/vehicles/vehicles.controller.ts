import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, UseInterceptors, UploadedFile, ParseFilePipeBuilder, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { VehiclesService } from './vehicles.service';
import { FleetService } from './fleet.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

class CreateVehicleDto {
  @IsString() plateNumber: string;
  @IsString() vehicleType: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsNumber() modelYear?: number;
  @IsOptional() @IsString() trailerType?: string;
  @IsOptional() @IsNumber() @Min(0) tonnageCapacity?: number;
  @IsOptional() @IsNumber() @Min(0) volumeCapacity?: number;
  @IsOptional() @IsBoolean() hasRefrigeration?: boolean;
}

class UpdateVehicleDto {
  @IsOptional() @IsString() plateNumber?: string;
  @IsOptional() @IsString() vehicleType?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsNumber() modelYear?: number;
  @IsOptional() @IsString() trailerType?: string;
  @IsOptional() @IsNumber() @Min(0) tonnageCapacity?: number;
  @IsOptional() @IsNumber() @Min(0) volumeCapacity?: number;
  @IsOptional() @IsBoolean() hasRefrigeration?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller('vehicles')
@UseGuards(AuthGuard('jwt'))
export class VehiclesController {
  constructor(
    private service: VehiclesService,
    private fleetService: FleetService,
  ) {}

  @Get('fleet/dashboard')
  getFleetDashboard(@Req() req: any) { return this.fleetService.getFleetDashboard(req.user.id); }

  @Get('fleet/:vehicleId/history')
  getVehicleHistory(@Param('vehicleId') vehicleId: string, @Req() req: any) {
    return this.fleetService.getVehicleLoadHistory(vehicleId, req.user.id);
  }

  @Get('my')
  getMyVehicles(@Req() req: any) { return this.service.getMyVehicles(req.user.id); }

  @Post()
  create(@Body() body: CreateVehicleDto, @Req() req: any) { return this.service.createVehicle(req.user.id, body); }

  @Get(':id')
  getOne(@Param('id') id: string, @Req() req: any) { return this.service.getVehicle(id, req.user.id); }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateVehicleDto, @Req() req: any) { return this.service.updateVehicle(id, req.user.id, body); }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) { return this.service.deleteVehicle(id, req.user.id); }

  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('file'))
  uploadPhoto(
    @Param('id') id: string,
    @UploadedFile(new ParseFilePipeBuilder().addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }).addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 }).build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY })) file: any,
    @Req() req: any,
  ) {
    const fileUrl = `https://storage.kaptan.com/vehicles/${file.originalname}`;
    return this.service.uploadPhoto(id, req.user.id, fileUrl);
  }

  @Delete('photos/:photoId')
  deletePhoto(@Param('photoId') photoId: string, @Req() req: any) {
    return this.service.deletePhoto(photoId, req.user.id);
  }

  @Get(':id/check-sale')
  checkSaleCriteria(@Param('id') id: string, @Req() req: any) {
    return this.service.checkSaleCriteria(id, req.user.id);
  }
}

@Controller('categories')
export class CategoriesController {
  constructor(private service: VehiclesService) {}

  @Get()
  getTree() { return this.service.getCategories(); }

  @Get(':slug')
  getOne(@Param('slug') slug: string, @Query() query: any) {
    return this.service.getCategoryListings(slug, query);
  }
}

@Controller('listings')
export class ListingsController {
  constructor(private service: VehiclesService) {}

  @Get()
  getListings(@Query() query: any) { return this.service.getListings(query); }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() body: { vehicleId: string; price: number; description: string; city: string }, @Req() req: any) {
    return this.service.createListing(req.user.id, body);
  }

  @Get(':id')
  getOne(@Param('id') id: string) { return this.service.getListing(id); }

  @Post(':id/bids')
  @UseGuards(AuthGuard('jwt'))
  placeBid(@Param('id') id: string, @Body('amount') amount: number, @Req() req: any) {
    return this.service.placeBid(id, req.user.id, amount);
  }

  @Post(':id/buy')
  @UseGuards(AuthGuard('jwt'))
  buyNow(@Param('id') id: string, @Req() req: any) { return this.service.buyNow(id, req.user.id); }
}

@Controller('admin/escrow')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
export class EscrowAdminController {
  constructor(private service: VehiclesService) {}

  @Get('status')
  getStatus() { return this.service.getEscrowStatus(); }

  @Post('toggle')
  toggle() { return this.service.toggleEscrow(); }
}
