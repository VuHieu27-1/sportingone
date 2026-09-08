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
import { CoinTransactionsService } from './coin_transactions.service';
import { CreateCoinTransactionDto } from './dto/create-coin_transaction.dto';
import { UpdateCoinTransactionDto } from './dto/update-coin_transaction.dto';
import { CreateCoinDepositDto } from './dto/create-coin-deposit.dto';
import { RequestWithdrawDto } from './dto/request-withdraw.dto';
import { RejectTransactionDto } from './dto/reject-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('coin-transactions')
export class CoinTransactionsController {
  constructor(
    private readonly coinTransactionsService: CoinTransactionsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('request-withdraw')
  requestWithdraw(@Req() req: any, @Body() dto: RequestWithdrawDto) {
    return this.coinTransactionsService.requestWithdraw(req.user.id, dto);
  }

  /**
   * Retrieves Approvals information.
   */
  @UseGuards(JwtAuthGuard)
  @Get('admin/approvals')
  findApprovals() {
    return this.coinTransactionsService.findApprovals();
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/approve/:id')
  approveTransaction(@Param('id') id: string) {
    return this.coinTransactionsService.approveTransaction(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/reject/:id')
  rejectTransaction(
    @Param('id') id: string,
    @Body() dto: RejectTransactionDto,
  ) {
    return this.coinTransactionsService.rejectTransaction(+id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create-deposit')
  createDeposit(@Req() req: any, @Body() dto: CreateCoinDepositDto) {
    return this.coinTransactionsService.createDeposit(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync-deposit/:orderCode')
  syncDepositStatus(@Param('orderCode') orderCode: string) {
    return this.coinTransactionsService.syncDepositStatus(orderCode);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel-deposit/:orderCode')
  cancelDeposit(@Param('orderCode') orderCode: string) {
    return this.coinTransactionsService.cancelDeposit(orderCode);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createDto: CreateCoinTransactionDto) {
    return this.coinTransactionsService.create(createDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  findMyTransactions(@Req() req: any) {
    return this.coinTransactionsService.findByUserId(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.coinTransactionsService.findByUserId(+userId);
  }

  /**
   * Retrieves All information.
   */
  @Get()
  findAll() {
    return this.coinTransactionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coinTransactionsService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCoinTransactionDto,
  ) {
    return this.coinTransactionsService.update(+id, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coinTransactionsService.remove(+id);
  }
}
