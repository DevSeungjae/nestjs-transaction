import { DynamicModule, Module, Provider } from '@nestjs/common';
import { Knex } from 'knex';
import { TransactionOptions } from '../../interfaces';
import { TRANSACTION_MANAGER } from '../../providers';
import { KnexUnitOfWork } from './knex-unit-of-work';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TransactionInterceptor } from 'src/interceptors/transaction.interceptor';

export interface KnexTransactionModuleOptions {
  connection: Knex | string;
  defaultOptions?: TransactionOptions;
  global?: boolean;
}

@Module({})
export class KnexTransactionModule {
  static forRoot(options: KnexTransactionModuleOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'KNEX_CONNECTION',
        useValue: options.connection,
      },
      {
        provide: KnexUnitOfWork,
        useFactory: (knex: Knex) => new KnexUnitOfWork(knex),
        inject: ['KNEX_CONNECTION'],
      },
      {
        provide: TRANSACTION_MANAGER,
        useExisting: KnexUnitOfWork,
      }
    ];

    if (options.global) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useFactory: (unitOfWork: KnexUnitOfWork) => new TransactionInterceptor(null, unitOfWork, options.defaultOptions),
        inject: [KnexUnitOfWork],
      });
    }
    return {
      module: KnexTransactionModule,
      providers,
      exports: [TRANSACTION_MANAGER, KnexUnitOfWork],
    };
  }
}
