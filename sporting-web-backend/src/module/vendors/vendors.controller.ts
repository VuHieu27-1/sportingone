import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VendorOrAdminGuard } from '../auth/guards/vendor-or-admin.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';
import type { BufferedFile } from '../../common/google-drive/google-drive.service';

@Controller('vendors')
export class VendorsController {
  constructor(private readonly service: VendorsService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createDto: CreateVendorDto, @Req() req: any) {
    return this.service.create(createDto, req.user?.id);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const latNum = lat !== undefined && lat !== '' ? parseFloat(lat) : undefined;
    const lngNum = lng !== undefined && lng !== '' ? parseFloat(lng) : undefined;
    return this.service.findAll(status, latNum, lngNum);
  }

  /**
   * Dedicated API for Admin to paginate Vendors with SQL LIMIT & OFFSET
   */
  @Get('query')
  findAdminVendorPaginated(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAdminVendorPaginated({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 8,
      status,
      search,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  findMyVendors(@Req() req: any) {
    return this.service.findByUserId(req.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('my/hours')
  updateMyHours(
    @Req() req: any,
    @Body() body: { openTime?: string; closeTime?: string }
  ) {
    return this.service.updateMyVendorHours(req.user?.id, body.openTime, body.closeTime);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, VendorOrAdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateVendorDto) {
    return this.service.update(+id, updateDto);
  }

  @UseGuards(JwtAuthGuard, VendorOrAdminGuard)
  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: BufferedFile,
    @Req() req: any,
  ) {
    return this.service.updateAvatar(
      +id,
      file,
      req.user?.id,
      req.user?.role?.roleName || req.user?.role,
    );
  }

  @UseGuards(JwtAuthGuard, VendorOrAdminGuard)
  @Delete(':id/avatar')
  deleteAvatar(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteAvatar(
      +id,
      req.user?.id,
      req.user?.role?.roleName || req.user?.role,
    );
  }

  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.service.restore(+id);
  }

  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
