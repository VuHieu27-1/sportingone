import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post } from './entities/post.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private readonly repository: Repository<Post>,
    @InjectRepository(User) private readonly userRepository: Repository<User>
  ) {}

  async create(dto: CreatePostDto) {
    const { userId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<Post>);
    const userVal = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!userVal) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }
    entity.user = userVal;
    return this.repository.save(entity);
  }

  async findAll() {
    return this.repository.find({
      relations: { user: true, comments: true }
    });
  }

  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { user: true, comments: true }
    });
    if (!entity) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    return entity;
  }

  async update(id: number, dto: UpdatePostDto) {
    const entity = await this.findOne(id);
    const { userId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto as any);
    if (dto.userId !== undefined) {
      const userVal = await this.userRepository.findOne({ where: { id: dto.userId } });
      if (!userVal) {
        throw new NotFoundException(`User with ID ${dto.userId} not found`);
      }
      entity.user = userVal;
    }
    return this.repository.save(entity);
  }

  async remove(id: number) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return "Delete success";
  }
}
