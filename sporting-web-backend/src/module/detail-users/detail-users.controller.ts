import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DetailUsersService } from './detail-users.service';
import { CreateDetailUserDto } from './dto/create-detail-user.dto';
import { UpdateDetailUserDto } from './dto/update-detail-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DetailUserSelfOrAdminGuard } from '../auth/guards/detail-user-self-or-admin.guard';

@Controller('detail-users')
export class DetailUsersController {
  constructor(private readonly detailUsersService: DetailUsersService) { }

  @Get('guest-vendor-distances')
  getGuestVendorDistances(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ) {
    return this.detailUsersService.getGuestVendorDistances({
      lat,
      lng,
      latitude,
      longitude,
    });
  }

  @UseGuards(JwtAuthGuard, DetailUserSelfOrAdminGuard)
  @Post()
  create(@Request() req: any, @Body() createDetailUserDto: CreateDetailUserDto) {
    createDetailUserDto.userId = req.user.id;
    return this.detailUsersService.create(createDetailUserDto);
  }

  @UseGuards(JwtAuthGuard, DetailUserSelfOrAdminGuard)
  @Get()
  findMyDetail(@Request() req: any) {
    return this.detailUsersService.findOneByUserId(req.user.id);
  }

  @UseGuards(JwtAuthGuard, DetailUserSelfOrAdminGuard)
  @Get('vendor-distances')
  getVendorDistances(@Request() req: any) {
    return this.detailUsersService.getVendorDistances(req.user.id);
  }

  @UseGuards(JwtAuthGuard, DetailUserSelfOrAdminGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.detailUsersService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, DetailUserSelfOrAdminGuard)
  @Patch('/my')
  updateMyDetail(
    @Request() req: any,
    @Body() updateDetailUserDto: UpdateDetailUserDto,
  ) {
    return this.detailUsersService.updateByUserId(req.user.id, updateDetailUserDto);
  }

  @UseGuards(JwtAuthGuard, DetailUserSelfOrAdminGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDetailUserDto: UpdateDetailUserDto,
  ) {
    return this.detailUsersService.update(+id, updateDetailUserDto);
  }

  @UseGuards(JwtAuthGuard, DetailUserSelfOrAdminGuard)
  @Delete()
  removeMyDetail(@Request() req: any) {
    return this.detailUsersService.removeByUserId(req.user.id);
  }

  @UseGuards(JwtAuthGuard, DetailUserSelfOrAdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.detailUsersService.remove(+id);
  }
}

