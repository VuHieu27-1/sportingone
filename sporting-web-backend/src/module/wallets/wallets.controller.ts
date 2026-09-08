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
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wallets')
export class WalletsController {
  constructor(private readonly service: WalletsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createDto: CreateWalletDto) {
    return this.service.create(createDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async findMyWallet(@Req() req: any) {
    return this.service.findOneByUserId(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('my')
  saveMyWallet(@Req() req: any, @Body() updateDto: UpdateWalletDto) {
    return this.service.updateOrCreateMyWallet(req.user.id, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.service.findOneByUserId(+userId);
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

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateWalletDto) {
    return this.service.update(+id, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
