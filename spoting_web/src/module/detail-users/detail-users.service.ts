import { Injectable } from '@nestjs/common';
import { CreateDetailUserDto } from './dto/create-detail-user.dto';
import { UpdateDetailUserDto } from './dto/update-detail-user.dto';

@Injectable()
export class DetailUsersService {
  create(createDetailUserDto: CreateDetailUserDto) {
    return 'This action adds a new detailUser';
  }

  findAll() {
    return `This action returns all detailUsers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} detailUser`;
  }

  update(id: number, updateDetailUserDto: UpdateDetailUserDto) {
    return `This action updates a #${id} detailUser`;
  }

  remove(id: number) {
    return `This action removes a #${id} detailUser`;
  }
}
