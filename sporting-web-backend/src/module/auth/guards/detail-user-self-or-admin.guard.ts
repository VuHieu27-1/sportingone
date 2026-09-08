import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetailUser } from '../../detail-users/entities/detail-user.entity';

@Injectable()
export class DetailUserSelfOrAdminGuard implements CanActivate {
  constructor(
    @InjectRepository(DetailUser)
    private readonly detailUserRepository: Repository<DetailUser>,
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

    if (user.role === 'admin') {
      return true;
    }

    if (request.method === 'POST') {
      if (body) {
        if (!body.userId) {
          body.userId = user.id;
        }
        if (user.id === +body.userId) {
          return true;
        }
      }
      throw new ForbiddenException(
        'You can only create detail info for your own account.',
      );
    }

    if (!params.id) {
      return true;
    }

    // For other endpoints with :id, fetch the detail user to verify owner
    if (params.id) {
      const detailUser = await this.detailUserRepository.findOne({
        where: { id: +params.id },
      });
      if (!detailUser) {
        throw new NotFoundException(`DetailUser with ID ${params.id} not found`);
      }
      if (detailUser.userId === user.id) {
        return true;
      }
      throw new ForbiddenException(
        'You are not authorized to access this detail user info.',
      );
    }

    throw new ForbiddenException(
      'You are not authorized to perform this operation.',
    );
  }
}
