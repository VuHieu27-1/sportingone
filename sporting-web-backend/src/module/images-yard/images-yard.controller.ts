import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImagesYardService } from './images-yard.service';
import { CreateImagesYardDto } from './dto/create-images-yard.dto';
import { UpdateImagesYardDto } from './dto/update-images-yard.dto';
import { UploadImagesYardDto } from './dto/upload-images-yard.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VendorOrAdminGuard } from '../auth/guards/vendor-or-admin.guard';
import type { BufferedFile } from '../../common/google-drive/google-drive.service';

@Controller('images-yard')
export class ImagesYardController {
  constructor(private readonly imagesYardService: ImagesYardService) {}

  /**
   * Vendor & Admin upload yard image file directly to Google Drive (folder: images-yard)
   */
  @UseGuards(JwtAuthGuard, VendorOrAdminGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @UploadedFile() file: BufferedFile,
    @Body() uploadDto: UploadImagesYardDto,
  ) {
    return this.imagesYardService.uploadYardImageFile(file, uploadDto);
  }

  /**
   * Only Vendor and Admin can create yard images by URL.
   */
  @UseGuards(JwtAuthGuard, VendorOrAdminGuard)
  @Post()
  create(@Body() createImagesYardDto: CreateImagesYardDto) {
    return this.imagesYardService.create(createImagesYardDto);
  }

  /**
   * All roles (users, players, guests, vendors, admins) can view all images.
   */
  @Get()
  findAll() {
    return this.imagesYardService.findAll();
  }

  /**
   * All roles can view images for a specific sports yard.
   */
  @Get('yard/:yardId')
  findByYard(@Param('yardId') yardId: string) {
    return this.imagesYardService.findByYard(+yardId);
  }

  /**
   * All roles can view single image details.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.imagesYardService.findOne(+id);
  }

  /**
   * Only Vendor and Admin can update yard images.
   */
  @UseGuards(JwtAuthGuard, VendorOrAdminGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateImagesYardDto: UpdateImagesYardDto,
  ) {
    return this.imagesYardService.update(+id, updateImagesYardDto);
  }

  /**
   * Only Vendor and Admin can delete yard images.
   */
  @UseGuards(JwtAuthGuard, VendorOrAdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.imagesYardService.remove(+id);
  }
}
