import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseEnvelope<T> {
  success: boolean;
  statusCode: number;
  data: T;
  meta?: any;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseEnvelope<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseEnvelope<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((resData) => {
        if (
          resData &&
          typeof resData === 'object' &&
          'success' in resData &&
          typeof (resData as any).success === 'boolean'
        ) {
          return {
            statusCode,
            timestamp: new Date().toISOString(),
            ...resData,
          };
        }

        if (
          resData &&
          typeof resData === 'object' &&
          'data' in resData &&
          'total' in resData
        ) {
          const { data, total, page, limit, totalPages, ...rest } = resData;
          return {
            success: true,
            statusCode,
            data,
            meta: { total, page, limit, totalPages, ...rest },
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          statusCode,
          data: resData ?? null,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
