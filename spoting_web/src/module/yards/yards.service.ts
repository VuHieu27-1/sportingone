import { Injectable } from '@nestjs/common';
import { CreateYardDto } from './dto/create-yard.dto';
import { UpdateYardDto } from './dto/update-yard.dto';

@Injectable()
export class YardsService {
  create(createYardDto: CreateYardDto) {
    return 'This action adds a new yard';
  }

  findAll() {
    return `This action returns all yards`;
  }

  findOne(id: number) {
    return `This action returns a #${id} yard`;
  }

  update(id: number, updateYardDto: UpdateYardDto) {
    return `This action updates a #${id} yard`;
  }

  remove(id: number) {
    return `This action removes a #${id} yard`;
  }
}
