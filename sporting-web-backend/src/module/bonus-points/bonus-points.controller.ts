import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BonusPointsService } from './bonus-points.service';
import { CreateBonusPointDto } from './dto/create-bonus-point.dto';
import { UpdateBonusPointDto } from './dto/update-bonus-point.dto';

@Controller('bonus-points')
export class BonusPointsController {
  constructor(private readonly service: BonusPointsService) {}

  @Post()
  create(@Body() createDto: CreateBonusPointDto) {
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateBonusPointDto) {
    return this.service.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
