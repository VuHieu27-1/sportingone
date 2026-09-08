import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Yard } from '../../yards/entities/yard.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class YardSelfOrAdminGuard implements CanActivate {
  constructor(
    @InjectRepository(Yard)
    private readonly yardRepository: Repository<Yard>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Executes can Activate operation.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;
    const body = request.body;

    if (!user) {
      return false;
    }

    const dbUser = await this.userRepository.findOne({
      where: { id: user.id },
      relations: { role: true },
    });

    const roleName = dbUser?.role ? dbUser.role.roleName : 'user';

    if (roleName === 'admin') {
      return true;
    }

    if (roleName === 'user') {
      throw new ForbiddenException(
        'Tài khoản người dùng (User) không có quyền thực hiện thao tác trên sân thể thao.',
      );
    }

    if (roleName === 'vendor') {
      if (request.method === 'POST') {
        const myVendors = await this.vendorRepository.find({
          where: { user: { id: user.id }, status: 'active' },
          relations: { user: true },
        });

        if (myVendors.length === 0) {
          throw new ForbiddenException(
            'Tài khoản Vendor của bạn chưa có cơ sở Vendor được phê duyệt!',
          );
        }

        if (body && body.vendorId) {
          const isOwnVendor = myVendors.some((v) => v.id === +body.vendorId);
          if (!isOwnVendor) {
            throw new ForbiddenException(
              'Bạn chỉ có thể tạo sân thể thao cho cơ sở Vendor của chính mình!',
            );
          }
        } else if (body) {
          body.vendorId = myVendors[0].id;
        }
        return true;
      }

      if (params.id) {
        const yard = await this.yardRepository.findOne({
          where: { id: +params.id },
          relations: { vendor: { user: true } },
        });

        if (!yard) {
          throw new NotFoundException(`Không tìm thấy sân thể thao có ID ${params.id}`);
        }

        if (yard.vendor?.user?.id === user.id) {
          return true;
        }

        throw new ForbiddenException(
          'Bạn chỉ có quyền thực hiện thao tác trên sân thể thao thuộc sở hữu của chính mình!',
        );
      }
    }

    throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này.');
  }
}
