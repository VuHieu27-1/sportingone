import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './entities/comment.entity';
import { Post } from '../posts/entities/post.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment) private readonly repository: Repository<Comment>,
    @InjectRepository(Post) private readonly postRepository: Repository<Post>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Creates or saves record.
   */
  async create(dto: CreateCommentDto) {
    const { postId, userId, parentCommentId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<Comment>);
    const postVal = await this.postRepository.findOne({
      where: { id: dto.postId },
    });
    if (!postVal) {
      throw new NotFoundException(`Post with ID ${dto.postId} not found`);
    }
    entity.post = postVal;
    const userVal = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (!userVal) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }
    entity.user = userVal;
    if (dto.parentCommentId !== undefined && dto.parentCommentId !== null) {
      const parentCommentVal = await this.repository.findOne({
        where: { id: dto.parentCommentId },
      });
      if (!parentCommentVal) {
        throw new NotFoundException(
          `Comment with ID ${dto.parentCommentId} not found`,
        );
      }
      entity.parentComment = parentCommentVal;
    }
    return this.repository.save(entity);
  }

  /**
   * Retrieves All information.
   */
  async findAll() {
    return this.repository.find({
      relations: { post: true, user: true, parentComment: true, replies: true },
    });
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { post: true, user: true, parentComment: true, replies: true },
    });
    if (!entity) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Updates record details.
   */
  async update(id: number, dto: UpdateCommentDto) {
    const entity = await this.findOne(id);
    const { postId, userId, parentCommentId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto);
    if (dto.postId !== undefined) {
      const postVal = await this.postRepository.findOne({
        where: { id: dto.postId },
      });
      if (!postVal) {
        throw new NotFoundException(`Post with ID ${dto.postId} not found`);
      }
      entity.post = postVal;
    }
    if (dto.userId !== undefined) {
      const userVal = await this.userRepository.findOne({
        where: { id: dto.userId },
      });
      if (!userVal) {
        throw new NotFoundException(`User with ID ${dto.userId} not found`);
      }
      entity.user = userVal;
    }
    if (dto.parentCommentId !== undefined) {
      if (dto.parentCommentId === null) {
        entity.parentComment = null;
      } else {
        const parentCommentVal = await this.repository.findOne({
          where: { id: dto.parentCommentId },
        });
        if (!parentCommentVal) {
          throw new NotFoundException(
            `Comment with ID ${dto.parentCommentId} not found`,
          );
        }
        entity.parentComment = parentCommentVal;
      }
    }
    return this.repository.save(entity);
  }

  /**
   * Deletes or cancels record.
   */
  async remove(id: number) {
    const entity = await this.findOne(id);
    await this.repository.softDelete(id);
    return 'Delete success';
  }
}
