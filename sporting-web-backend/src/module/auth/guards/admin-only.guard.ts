import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class AdminOnlyGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Executes can Activate operation.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const dbUser = await this.userRepository.findOne({
      where: { id: user.id },
      relations: { role: true },
    });

    const roleName = dbUser?.role ? dbUser.role.roleName : (typeof user.role === 'object' ? user.role?.roleName : user.role);

    if (roleName === 'admin') {
      return true;
    }

    throw new ForbiddenException(
      'Chỉ Admin mới có quyền thực hiện thao tác này.',
    );
  }
}
