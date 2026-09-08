import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAddress } from './entities/user_address.entity';
import { User } from '../users/entities/user.entity';
import { CreateUserAddressDto } from './dto/create-user_address.dto';
import { UpdateUserAddressDto } from './dto/update-user_address.dto';
import { OpenRouteServiceService } from '../../common/open-route-service/open-route-service.service';

@Injectable()
export class UserAddressService {
  constructor(
    @InjectRepository(UserAddress)
    private readonly userAddressRepository: Repository<UserAddress>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly openRouteService: OpenRouteServiceService,
  ) { }

  async create(userId: number, dto: CreateUserAddressDto): Promise<UserAddress> {
    if (!dto.address || !dto.address.trim()) {
      throw new BadRequestException('Địa chỉ không được để trống.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User với ID ${userId} không tồn tại.`);
    }

    const trimmedAddress = dto.address.trim();

    const existingSameAddress = await this.userAddressRepository.findOne({
      where: { userId, address: trimmedAddress },
    });
    if (existingSameAddress) {
      throw new ConflictException('Địa chỉ này đã tồn tại trong sổ địa chỉ của bạn.');
    }

    const existingCount = await this.userAddressRepository.count({
      where: { userId },
    });

    const isFirstAddress = existingCount === 0;
    const isDefault = dto.isDefault !== undefined ? dto.isDefault : isFirstAddress;

    if (isDefault && existingCount > 0) {
      await this.userAddressRepository.update({ userId }, { isDefault: false });
    }

    let lat = dto.latitude ?? null;
    let lng = dto.longitude ?? null;

    if ((lat === null || lng === null) && dto.address && dto.address.trim()) {
      const geo = await this.openRouteService.geocodeAddress(dto.address.trim());
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      }
    }

    const newAddress = this.userAddressRepository.create({
      userId,
      address: dto.address.trim(),
      latitude: lat,
      longitude: lng,
      isDefault,
    });

    return this.userAddressRepository.save(newAddress);
  }

  async findAllByUserId(userId: number): Promise<UserAddress[]> {
    return this.userAddressRepository.find({
      where: { userId },
      order: {
        isDefault: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: number, userId?: number): Promise<UserAddress> {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }
    const addr = await this.userAddressRepository.findOne({ where });
    if (!addr) {
      throw new NotFoundException(`UserAddress với ID ${id} không tồn tại.`);
    }
    return addr;
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateUserAddressDto,
  ): Promise<UserAddress> {
    const addr = await this.findOne(id, userId);

    if (dto.isDefault) {
      await this.userAddressRepository.update({ userId }, { isDefault: false });
      addr.isDefault = true;
    }

    if (dto.address !== undefined && dto.address.trim() !== '') {
      const addressChanged = dto.address.trim() !== addr.address;
      addr.address = dto.address.trim();

      if (
        addressChanged &&
        (dto.latitude === undefined || dto.latitude === null) &&
        (dto.longitude === undefined || dto.longitude === null)
      ) {
        const geo = await this.openRouteService.geocodeAddress(addr.address);
        if (geo) {
          addr.latitude = geo.lat;
          addr.longitude = geo.lng;
        }
      }
    }

    if (dto.latitude !== undefined) addr.latitude = dto.latitude;
    if (dto.longitude !== undefined) addr.longitude = dto.longitude;

    return this.userAddressRepository.save(addr);
  }

  async setDefault(id: number, userId: number): Promise<UserAddress> {
    const addr = await this.findOne(id, userId);
    await this.userAddressRepository.update({ userId }, { isDefault: false });
    addr.isDefault = true;
    return this.userAddressRepository.save(addr);
  }

  async remove(id: number, userId: number): Promise<{ success: boolean; message: string }> {
    const addr = await this.findOne(id, userId);
    const wasDefault = addr.isDefault;

    await this.userAddressRepository.softDelete(id);

    if (wasDefault) {
      const remaining = await this.userAddressRepository.findOne({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      if (remaining) {
        remaining.isDefault = true;
        await this.userAddressRepository.save(remaining);
      }
    }

    return {
      success: true,
      message: 'Xóa địa chỉ thành công.',
    };
  }
}
