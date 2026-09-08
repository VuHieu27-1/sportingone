import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
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
  ) {}

  /**
   * Creates or saves record.
   */
  async create(createRoleDto: CreateRoleDto) {
    const existingRole = await this.roleRepository.findOne({
      where: { roleName: createRoleDto.roleName },
    });
    if (existingRole) {
      throw new ConflictException(
        `Role with name "${createRoleDto.roleName}" already exists`,
      );
    }
    const role = this.roleRepository.create(createRoleDto);
    return this.roleRepository.save(role);
  }

  /**
   * Retrieves All information.
   */
  async findAll() {
    return this.roleRepository.find();
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  /**
   * Updates record details.
   */
  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const role = await this.findOne(id);
    if (updateRoleDto.roleName) {
      const existingRole = await this.roleRepository.findOne({
        where: { roleName: updateRoleDto.roleName },
      });
      if (existingRole && existingRole.id !== id) {
        throw new ConflictException(
          `Role with name "${updateRoleDto.roleName}" already exists`,
        );
      }
    }
    this.roleRepository.merge(role, updateRoleDto);
    return this.roleRepository.save(role);
  }

  /**
   * Deletes or cancels record.
   */
  async remove(id: number) {
    const existingRole = await this.roleRepository.findOne({
      where: { id },
    });
    if (!existingRole) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    await this.roleRepository.softDelete(id);
    return 'Delete success';
  }
}
