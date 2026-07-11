import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) { }

  async create(createRoleDto: CreateRoleDto) {
    const existingRole = await this.roleRepository.findOne({
      where: { roleName: createRoleDto.roleName },
    });
    if (existingRole) {
      throw new ConflictException(`Role with name "${createRoleDto.roleName}" already exists`);
    }
    const role = this.roleRepository.create(createRoleDto);
    return this.roleRepository.save(role);
  }

  async findAll() {
    return this.roleRepository.find();
  }

  async findOne(id: number) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const role = await this.findOne(id);
    if (updateRoleDto.roleName) {
      const existingRole = await this.roleRepository.findOne({
        where: { roleName: updateRoleDto.roleName },
      });
      if (existingRole && existingRole.id !== id) {
        throw new ConflictException(`Role with name "${updateRoleDto.roleName}" already exists`);
      }
    }
    this.roleRepository.merge(role, updateRoleDto);
    return this.roleRepository.save(role);
  }

  async remove(id: number) {
    const existingRole = await this.roleRepository.findOne({
      where: { id },
    });
    if (!existingRole) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    await this.roleRepository.remove(existingRole);
    return "Delete success";
  }
}
