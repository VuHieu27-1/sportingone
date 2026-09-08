import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { User } from '../users/entities/user.entity';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  /**
   * Creates or saves record.
   */
  async create(createWalletDto: CreateWalletDto) {
    const user = await this.userRepository.findOne({
      where: { id: createWalletDto.userId },
      relations: { wallet: true },
    });
    if (!user) {
      throw new NotFoundException(
        `User with ID ${createWalletDto.userId} not found`,
      );
    }
    if (user.wallet) {
      throw new BadRequestException(
        `Wallet for User ID ${createWalletDto.userId} already exists`,
      );
    }
    const wallet = this.walletRepository.create({
      ...createWalletDto,
      balance: createWalletDto.balance ?? 0,
    });
    return this.walletRepository.save(wallet);
  }

  /**
   * Retrieves All information.
   */
  async findAll() {
    return this.walletRepository.find({ relations: { user: true } });
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number) {
    const wallet = await this.walletRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${id} not found`);
    }
    return wallet;
  }

  /**
   * Retrieves OneByUserId information.
   */
  async findOneByUserId(userId: number) {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
      relations: { user: true },
    });
    delete (wallet?.user as Partial<User>).password;
    return wallet;
  }

  async updateOrCreateMyWallet(
    userId: number,
    updateWalletDto: UpdateWalletDto,
  ) {
    let wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      wallet = this.walletRepository.create({
        userId,
        bankName: updateWalletDto.bankName ?? null,
        bankNumber: updateWalletDto.bankNumber ?? null,
        bankAccountName: updateWalletDto.bankAccountName ?? null,
        balance: updateWalletDto.balance ?? 0,
      });
    } else {
      if (updateWalletDto.bankName !== undefined) {
        wallet.bankName = updateWalletDto.bankName;
      }
      if (updateWalletDto.bankNumber !== undefined) {
        wallet.bankNumber = updateWalletDto.bankNumber;
      }
      if (updateWalletDto.bankAccountName !== undefined) {
        wallet.bankAccountName = updateWalletDto.bankAccountName;
      }
      if (updateWalletDto.balance !== undefined) {
        wallet.balance = updateWalletDto.balance;
      }
    }
    return this.walletRepository.save(wallet);
  }

  /**
   * Updates record details.
   */
  async update(id: number, updateWalletDto: UpdateWalletDto) {
    const wallet = await this.findOne(id);
    this.walletRepository.merge(wallet, updateWalletDto);
    return this.walletRepository.save(wallet);
  }

  /**
   * Deletes or cancels record.
   */
  async remove(id: number) {
    const wallet = await this.findOne(id);
    return this.walletRepository.softDelete(wallet.id);
  }
}
