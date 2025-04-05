import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator that injects transaction object into controller or service methods
 */
export const Transaction = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.transaction;
  },
);
