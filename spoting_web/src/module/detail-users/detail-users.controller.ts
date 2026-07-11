import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DetailUsersService } from './detail-users.service';
import { CreateDetailUserDto } from './dto/create-detail-user.dto';
import { UpdateDetailUserDto } from './dto/update-detail-user.dto';

@Controller('detail-users')
export class DetailUsersController {
  constructor(private readonly detailUsersService: DetailUsersService) {}

  @Post()
  create(@Body() createDetailUserDto: CreateDetailUserDto) {
    return this.detailUsersService.create(createDetailUserDto);
  }

  @Get()
  findAll() {
    return this.detailUsersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.detailUsersService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDetailUserDto: UpdateDetailUserDto,
  ) {
    return this.detailUsersService.update(+id, updateDetailUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.detailUsersService.remove(+id);
  }
}
