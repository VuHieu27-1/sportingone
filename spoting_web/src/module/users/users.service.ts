import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConflictException } from '@nestjs/common';
import { DetailUser } from '../detail-users/entities/detail-user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    if (createUserDto.username) {
      const user = await this.userRepository.findOne({
        where: { username: createUserDto.username },
      });
      if (user) {
        throw new ConflictException(`User with name "${createUserDto.username}" already exists`);
      }
    }
    if (!createUserDto.roleId) {
      const role = await this.roleRepository.findOne({
        where: { roleName: 'user' },
      });
      if (!role) {
        throw new NotFoundException(`Role with name "user" not found`);
      }
      user.role = role;
    }
    if (createUserDto.roleId) {
      const role = await this.roleRepository.findOne({
        where: { id: createUserDto.roleId },
      });
      if (role) {
        user.role = role;
      }
    }

    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: {
        role: true,
        detailUser: true,
      },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        role: true,
        detailUser: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (updateUserDto.username) {
      const user = await this.userRepository.findOne({
        where: { username: updateUserDto.username },
      });
      if (user) {
        throw new ConflictException(`User with name "${updateUserDto.username}" already exists`);
      }
    }
    this.userRepository.merge(user, updateUserDto);

    if (updateUserDto.roleId) {
      const role = await this.roleRepository.findOne({
        where: { id: updateUserDto.roleId },
      });
      if (role) {
        user.role = role;
      }
    }

    return this.userRepository.save(user);
  }

  async remove(id: number): Promise<String> {
    const user = await this.findOne(id);
    if (!user.username) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.userRepository.remove(user);
    return "Delete success";
  }
}
