import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class UserSelfOrAdminGuard implements CanActivate {
  /**
   * Executes can Activate operation.
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;

    if (!user) {
      return false;
    }

    if (user.role === 'admin') {
      return true;
    }

    if (params.id && user.id === +params.id) {
      return true;
    }

    const path = request.path || request.url || '';

    if (
      path.includes('/profile') ||
      path.includes('/vendor') ||
      path.includes('/status') ||
      path.includes('/avatar')
    ) {
      return true;
    }

    throw new ForbiddenException(
      'You are not authorized to perform this operation.',
    );
  }
}
