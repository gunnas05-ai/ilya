import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNumber, IsBoolean, IsOptional, IsDateString, ValidateNested,
  IsObject, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ContactDto {
  @ApiProperty({ example: 'Ahmet Yilmaz' })
  @IsString()
  name: string;

  @ApiProperty({ example: '05321234567' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'ahmet@firma.com' })
  @IsOptional()
  @IsString()
  email?: string;
}

export class LocationDto {
  @ApiProperty({ example: 'Beylikdüzü OSB, İstanbul' })
  @IsString()
  address: string;

  @ApiProperty({ example: 41.0082 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: 28.9784 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiProperty({ type: ContactDto })
  @ValidateNested()
  @Type(() => ContactDto)
  contact: ContactDto;
}

export class CargoDto {
  @ApiProperty({ example: 24000 })
  @IsNumber()
  @Min(0)
  weight: number;

  @ApiProperty({ example: 90 })
  @IsNumber()
  @Min(0)
  volume: number;

  @ApiProperty({ example: 'FMCG' })
  @IsString()
  type: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  stackable: boolean;
}

export class CreateShipmentDto {
  @ApiProperty({ example: 'PO-12345', description: 'Shipper kendi siparis referansi' })
  @IsString()
  shipperRef: string;

  @ApiProperty({ type: LocationDto, description: 'Yukleme noktasi' })
  @ValidateNested()
  @Type(() => LocationDto)
  origin: LocationDto;

  @ApiProperty({ type: LocationDto, description: 'Teslimat noktasi' })
  @ValidateNested()
  @Type(() => LocationDto)
  destination: LocationDto;

  @ApiProperty({ type: CargoDto, description: 'Yuk bilgileri' })
  @ValidateNested()
  @Type(() => CargoDto)
  cargo: CargoDto;

  @ApiProperty({ example: '2026-06-01T08:00:00Z', description: 'Talep edilen yukleme tarihi' })
  @IsDateString()
  requiredDate: string;

  @ApiPropertyOptional({ example: 'broker-id-123', description: 'Gumruk komisyoncusu ID' })
  @IsOptional()
  @IsString()
  customsBroker?: string;
}
