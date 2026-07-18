import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateDetailUserDto } from './dto/create-detail-user.dto';
import { UpdateDetailUserDto } from './dto/update-detail-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DetailUser } from './entities/detail-user.entity';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DetailUsersService {
  constructor(
    @InjectRepository(DetailUser) private readonly detailUserRepository: Repository<DetailUser>,
    @InjectRepository(User) private readonly userRepository: Repository<User>
  ) { }
  async create(createDetailUserDto: CreateDetailUserDto) {
    const user = await this.userRepository.findOne({
      where: { id: createDetailUserDto.userId },
      relations: { detailUser: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${createDetailUserDto.userId} not found`);
    }
    if (user.detailUser) {
      throw new BadRequestException(`DetailUser for User ID ${createDetailUserDto.userId} already exists`);
    }
    const detailUser = this.detailUserRepository.create(createDetailUserDto);
    return this.detailUserRepository.save(detailUser);
  }

  async findAll() {
    return this.detailUserRepository.find();
  }

  async findOne(id: number) {
    return this.detailUserRepository.findOne({ where: { id } });
  }

  async update(id: number, updateDetailUserDto: UpdateDetailUserDto) {
    const detailUser = await this.findOne(id);
    if (!detailUser) {
      throw new NotFoundException(`DetailUser with ID ${id} not found`);
    }
    return this.detailUserRepository.update(id, updateDetailUserDto);
  }

  async remove(id: number) {
    const detailUser = await this.findOne(id);
    if (!detailUser) {
      throw new NotFoundException(`DetailUser with ID ${id} not found`);
    }
    return this.detailUserRepository.delete(id);
  }
}
