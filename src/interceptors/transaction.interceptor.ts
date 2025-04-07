import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
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
    // Get transaction options from method
    const options = this.reflector.get<TransactionOptions>(
      TRANSACTION_METADATA_KEY,
      context.getHandler(),
    );

    // If no @Transactional() decorator, proceed without transaction
    if (!options) {
      return next.handle();
    }

    // Merge options
    const mergedOptions = { ...this.defaultOptions, ...options };

    // Check if transaction is already active
    const isTransactionActive = this.unitOfWork.isTransactionActive();

    // Start transaction only if not already active
    let trx;
    if (!isTransactionActive) {
      trx = await this.unitOfWork.begin(mergedOptions);
    }

    // Handle based on context type
    if (context.getType() === 'http') {
      // For HTTP requests, add transaction to request object
      const request = context.switchToHttp().getRequest();
      request.transaction = trx;
    } else if (context.getType() === 'ws') {
      // Add transaction to WebSocket client
      const client = context.switchToWs().getClient();
      client.data = client.data || {};
      client.data.transaction = trx;
    } else if (context.getType() === 'rpc') {
      // Add transaction to RPC context
      const ctx = context.switchToRpc().getContext();
      ctx.transaction = trx;
    }

    return next.handle().pipe(
      // On success, commit (only if this interceptor started the transaction)
      tap(async () => {
        if (!isTransactionActive && this.unitOfWork.isTransactionActive()) {
          await this.unitOfWork.commit();
        }
      }),
      // On error, rollback (only if this interceptor started the transaction)
      catchError(async (err) => {
        if (!isTransactionActive && this.unitOfWork.isTransactionActive()) {
          await this.unitOfWork.rollback();
        }
        return throwError(() => err);
      }),
    );
  }
}