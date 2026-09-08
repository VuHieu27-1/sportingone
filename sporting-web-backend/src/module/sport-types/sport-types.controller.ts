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
import { SportTypesService } from './sport-types.service';
import { CreateSportTypeDto } from './dto/create-sport-type.dto';
import { UpdateSportTypeDto } from './dto/update-sport-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VendorOrAdminGuard } from '../auth/guards/vendor-or-admin.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';

@Controller('sport-types')
export class SportTypesController {
  constructor(private readonly service: SportTypesService) { }

  @UseGuards(JwtAuthGuard, VendorOrAdminGuard)
  @Post()
  create(@Body() createDto: CreateSportTypeDto) {
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
  update(@Param('id') id: string, @Body() updateDto: UpdateSportTypeDto) {
    return this.service.update(+id, updateDto);
  }

  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
