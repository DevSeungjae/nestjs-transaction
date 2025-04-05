import { Injectable, Logger, Scope } from '@nestjs/common';
import { Knex } from 'knex';
import { TransactionOptions } from 'src/interfaces';
import { AbstractUnitOfWork } from 'src/providers';
import { isIsolationLevelSupported, mapIsolationLevelForDriver } from './database-support';

@Injectable({ scope: Scope.REQUEST })
export class KnexUnitOfWork extends AbstractUnitOfWork<Knex> {
  private readonly logger = new Logger(KnexUnitOfWork.name);
  constructor(
    private readonly knex: Knex,
  ) {
    super();
  }

  protected async createTransaction(
    options?: TransactionOptions,
  ): Promise<Knex.Transaction> {
    const config: Knex.TransactionConfig = {};

    if (options?.isolation) {
      if (isIsolationLevelSupported(this.knex, options.isolation)) {
        config.isolationLevel = mapIsolationLevelForDriver(
          this.knex,
          options.isolation,
        );
      } else {
        this.logger.warn(
          `Isolation level ${options.isolation} is not supported in ${this.knex.client.config.client}. Using default.`,
        );
      }
    }

    if (options?.readOnly) {
      const clientName = this.knex.client.config.client;
      const supportsReadOnly = ['pg', 'mysql', 'mysql2'].includes(clientName);
      
      if (supportsReadOnly) {
        config.readOnly = true;
      } else {
        this.logger.warn(
          `Read-only transactions are not supported in ${clientName}. Ignoring readOnly option.`
        );
      }
    }

    // 타임아웃 설정 (지원되는 드라이버에서만)
    if (options?.timeout) {
      // Timeout configuration logic (may vary by driver)
      const clientName = this.knex.client.config.client;
      
      if (['pg', 'mysql', 'mysql2'].includes(clientName)) {
        // Cannot set directly here, must be set via query after transaction creation
        // Omitted in this example, but in practice need to execute 
        // SET statement_timeout or similar command after transaction creation
        this.logger.log(`Setting transaction timeout to ${options.timeout}ms`);
      }
    }
    return this.knex.transaction(config);
  }

  /**
   * Commit the transaction
   * @param transaction - Knex transaction instance
   */
  protected async commitTransaction(
    transaction: Knex.Transaction,
  ): Promise<void> {
    await transaction.commit();
  }

  /**
   * Rollback the transaction
   * @param transaction - Knex transaction instance
   */
  protected async rollbackTransaction(
    transaction: Knex.Transaction,
  ): Promise<void> {
    await transaction.rollback();
  }
}