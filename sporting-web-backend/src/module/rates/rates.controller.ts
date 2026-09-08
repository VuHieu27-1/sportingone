import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RatesService } from './rates.service';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { ReplyRateDto } from './dto/reply-rate.dto';
import type { BufferedFile } from '../../common/google-drive/google-drive.service';

@Controller('rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 5))
  uploadImages(@UploadedFiles() files: BufferedFile[]) {
    return this.ratesService.uploadImages(files);
  }

  @Post(':id/upload-images')
  @UseInterceptors(FilesInterceptor('files', 5))
  uploadImagesForRate(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: BufferedFile[],
  ) {
    return this.ratesService.uploadImages(files, id);
  }

  @Post()
  create(@Body() createRateDto: CreateRateDto) {
    return this.ratesService.create(createRateDto);
  }

  @Post(':id/reply')
  reply(
    @Param('id', ParseIntPipe) id: number,
    @Body() replyRateDto: ReplyRateDto,
  ) {
    return this.ratesService.reply(id, replyRateDto);
  }

  @Post(':id/like')
  like(
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { action?: 'like' | 'unlike' | 'toggle' },
  ) {
    return this.ratesService.like(id, body?.action);
  }

  @Get('yard/:yardId')
  findByYard(@Param('yardId', ParseIntPipe) yardId: number) {
    return this.ratesService.findByYard(yardId);
  }

  @Get('vendor/:vendorId')
  findByVendor(@Param('vendorId', ParseIntPipe) vendorId: number) {
    return this.ratesService.findByVendor(vendorId);
  }

  @Get('user/:userId')
  findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.ratesService.findByUser(userId);
  }

  @Get()
  findAll() {
    return this.ratesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ratesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRateDto: UpdateRateDto,
  ) {
    return this.ratesService.update(id, updateRateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ratesService.remove(id);
  }
}
