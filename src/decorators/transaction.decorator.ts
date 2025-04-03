import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 컨트롤러 또는 서비스 메서드에 트랜잭션 객체를 주입하는 데코레이터
 */
export const Transaction = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.transaction;
  },
);

// src/decorators/index.ts
export * from './transactional.decorator';
export * from './transaction.decorator';