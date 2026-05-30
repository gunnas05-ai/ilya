import { Controller, Get, Put, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

class UpdateProfileDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() licenseNumber?: string;
  @IsOptional() @IsString() plateNumber?: string;
  @IsOptional() @IsString() vehicleType?: string;
  @IsOptional() @IsString() vehicleCapacity?: string;
  @IsOptional() @IsNumber() tonnageCapacity?: number;
  @IsOptional() @IsNumber() volumeCapacity?: number;
  @IsOptional() @IsString() kBelgesi?: string;
  @IsOptional() @IsString() srcBelgesi?: string;
  @IsOptional() @IsString() iban?: string;
  @IsOptional() @IsString() taxNumber?: string;
  @IsOptional() @IsString() taxOffice?: string;
  @IsOptional() @IsString() tcKimlikNo?: string;
  @IsOptional() @IsBoolean() escrowAccountVerified?: boolean;
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req: any) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) return { user: null, profileCompletion: 0, missingFields: [], isProfileComplete: false };
    const completionPct = await this.usersService.getCompletionPercent(req.user.id);
    const missingFields = await this.usersService.getMissingFields(req.user.id);
    const { passwordHash, refreshToken, ...safeUser } = user;
    return {
      user: safeUser,
      profileCompletion: completionPct,
      missingFields,
      isProfileComplete: completionPct >= 80,
    };
  }

  @Put('profile')
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Get('carriers')
  @UseGuards(AuthGuard('jwt'))
  async listCarriers() {
    return this.usersService.getAllCarriers();
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  async listAllUsers() {
    const users = await this.usersService.findAllUsers();
    return { success: true, data: users };
  }

  @Post(':id/block')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  async toggleUserBlock(@Param('id') id: string) {
    const user = await this.usersService.toggleUserStatus(id);
    return { success: true, data: user };
  }

  @Post(':id/role')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin', 'admin')
  async updateUserRole(@Param('id') id: string, @Body('role') role: string) {
    const user = await this.usersService.updateUserRole(id, role);
    return { success: true, data: user };
  }
}
