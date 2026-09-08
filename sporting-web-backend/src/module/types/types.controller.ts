import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TypessService } from './types.service';
import { CreateTypesDto } from './dto/create-type.dto';
import { UpdateTypesDto } from './dto/update-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VendorOrAdminGuard } from '../auth/guards/vendor-or-admin.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';

@Controller('types')
export class TypessController {
  constructor(private readonly service: TypessService) {}

  @UseGuards(JwtAuthGuard, VendorOrAdminGuard)
  @Post()
  create(@Body() createDto: CreateTypesDto) {
    return this.service.create(createDto);
  }

  /**
   * Retrieves All information.
   */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateTypesDto) {
    return this.service.update(+id, updateDto);
  }

  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
