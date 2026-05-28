import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class AcceptLoadDto {
  @ApiProperty({ example: '34 ABC 123', description: 'Tasiyici arac plakasi' })
  @IsString()
  plateNumber: string;

  @ApiProperty({ example: 'Ahmet Yilmaz', description: 'Sofor adi' })
  @IsString()
  driverName: string;

  @ApiProperty({ example: '05321234567', description: 'Sofor telefonu' })
  @IsString()
  driverPhone: string;

  @ApiProperty({ example: 41.0082, description: 'Mevcut konum — enlem', required: false })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  currentLat?: number;

  @ApiProperty({ example: 28.9784, description: 'Mevcut konum — boylam', required: false })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  currentLng?: number;
}

export class UpdateStatusDto {
  @ApiProperty({
    example: 'IN_TRANSIT',
    enum: ['DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'UNLOADING', 'COMPLETED', 'DELAYED', 'CANCELLED'],
  })
  @IsString()
  status: string;

  @ApiProperty({ example: 41.0082, required: false })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiProperty({ example: 28.9784, required: false })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiProperty({ example: 'Trafik nedeniyle 1 saat gecikme', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
