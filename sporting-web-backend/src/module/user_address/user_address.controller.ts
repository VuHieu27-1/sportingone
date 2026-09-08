import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { UserAddressService } from './user_address.service';
import { CreateUserAddressDto } from './dto/create-user_address.dto';
import { UpdateUserAddressDto } from './dto/update-user_address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('user_address')
export class UserAddressController {
  constructor(private readonly userAddressService: UserAddressService) { }

  @Post()
  create(@Request() req: any, @Body() createUserAddressDto: CreateUserAddressDto) {
    const userId = req.user.id;
    return this.userAddressService.create(userId, createUserAddressDto);
  }

  @Get()
  findAllMyAddresses(@Request() req: any) {
    const userId = req.user.id;
    return this.userAddressService.findAllByUserId(userId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.id;
    return this.userAddressService.findOne(id, userId);
  }

  @Patch(':id/default')
  setDefault(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.id;
    return this.userAddressService.setDefault(id, userId);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserAddressDto: UpdateUserAddressDto,
  ) {
    const userId = req.user.id;
    return this.userAddressService.update(id, userId, updateUserAddressDto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.id;
    return this.userAddressService.remove(id, userId);
  }
}
