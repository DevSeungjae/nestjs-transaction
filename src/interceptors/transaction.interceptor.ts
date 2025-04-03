import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { IUnitOfWork, TransactionOptions } from '../interfaces';
import { TRANSACTION_MANAGER, TRANSACTION_METADATA_KEY } from '../providers';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TRANSACTION_MANAGER)
    private readonly unitOfWork: IUnitOfWork,
    @Optional() private readonly defaultOptions?: TransactionOptions,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // 메서드에서 트랜잭션 옵션 가져오기
    const options = this.reflector.get<TransactionOptions>(
      TRANSACTION_METADATA_KEY,
      context.getHandler(),
    );

    // @Transactional() 데코레이터가 없으면 인터셉트 없이 진행
    if (!options) {
      return next.handle();
    }

    // 옵션 병합
    const mergedOptions = { ...this.defaultOptions, ...options };

    // 트랜잭션이 이미 활성화되어 있는지 확인
    const isTransactionActive = this.unitOfWork.isTransactionActive();

    // 트랜잭션 시작
    const trx = await this.unitOfWork.begin(mergedOptions);

    // 컨텍스트 타입에 따른 처리
    if (context.getType() === 'http') {
      // HTTP 요청인 경우 트랜잭션을 요청 객체에 추가
      const request = context.switchToHttp().getRequest();
      request.transaction = trx;
    } else if (context.getType() === 'ws') {
      // WebSocket 클라이언트에 트랜잭션 추가
      const client = context.switchToWs().getClient();
      client.data = client.data || {};
      client.data.transaction = trx;
    } else if (context.getType() === 'rpc') {
      // RPC 컨텍스트에 트랜잭션 추가
      const ctx = context.switchToRpc().getContext();
      ctx.transaction = trx;
    }

    return next.handle().pipe(
      // 성공 시 커밋 (자신이 시작한 트랜잭션만)
      tap(async () => {
        if (!isTransactionActive && this.unitOfWork.isTransactionActive()) {
          await this.unitOfWork.commit();
        }
      }),
      // 실패 시 롤백 (자신이 시작한 트랜잭션만)
      catchError(async (err) => {
        if (!isTransactionActive && this.unitOfWork.isTransactionActive()) {
          await this.unitOfWork.rollback();
        }
        return throwError(() => err);
      }),
    );
  }
}