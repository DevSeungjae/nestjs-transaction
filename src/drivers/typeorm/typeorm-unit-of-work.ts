import { Injectable, Logger, Scope } from "@nestjs/common";
import { AbstractUnitOfWork } from "src/providers";
import { DataSource, EntityManager, QueryRunner } from "typeorm";
import { IsolationLevel as TypeOrmIsolationLevel } from "typeorm/driver/types/IsolationLevel";
import { TransactionOptions } from "../../interfaces";
import { isIsolationLevelSupported, mapIsolationLevelForDriver } from "./database-support";

@Injectable({ scope: Scope.REQUEST })
export class TypeOrmUnitOfWork extends AbstractUnitOfWork {
  private readonly logger = new Logger(TypeOrmUnitOfWork.name);
  private queryRunner: QueryRunner | null = null;

  constructor(
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  protected async createTransaction(
    options?: TransactionOptions,
  ): Promise<EntityManager> {
    this.queryRunner = this.dataSource.createQueryRunner();
    await this.queryRunner.connect();

    // Set isolation level
    let isolationLevel: TypeOrmIsolationLevel | undefined;

    if (options?.isolation) {
      if (isIsolationLevelSupported(this.dataSource, options.isolation)) {
        isolationLevel = mapIsolationLevelForDriver(this.dataSource, options.isolation) as TypeOrmIsolationLevel;
      } else {
        this.logger.warn(
          `Isolation level ${options.isolation} is not supported in ${this.dataSource.driver.options.type}. Using default.`
        )
      }
    }

    if (!isolationLevel) {
      await this.queryRunner.startTransaction(isolationLevel);
    } else {
      await this.queryRunner.startTransaction();
    }

    if (options?.readOnly) {
      const driverType = this.dataSource.driver.options.type as string;
      const supportsReadOnly = ['postgres', 'mysql', 'mariadb'].includes(driverType);

      if (!supportsReadOnly) {
        try {
          await this.queryRunner.query('SET TRANSACTION READ ONLY');
        } catch (error) {
          this.logger.warn(
            `Failed to set read-only transaction: ${error.message}`
          );
        }
      } else {
        this.logger.warn(
          `Read-only transactions are not supported in ${driverType}. Ignoring readOnly option.`
        );
      }

      
    }

    // Set timeout (works only on supported databases)
    if (options?.timeout) {
      const driverType = this.dataSource.driver.options.type as string;

      try {
        // Set explicit transaction timeout for Postgres
        if (driverType === 'postgres') {
          await this.queryRunner.query(`SET statement_timeout = ${options.timeout}`);
        }
        // Set explicit transaction timeout for MySQL and MariaDB
        else if (driverType === 'mysql' || driverType === 'mariadb') {
          await this.queryRunner.query(`SET innodb_lock_wait_timeout = ${Math.ceil(options.timeout / 1000)}`);
        }
        // Set explicit transaction timeout for MSSQL
        else if (driverType === 'mssql') {
          await this.queryRunner.query(`SET LOCK_TIMEOUT ${options.timeout}`);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to set transaction timeout: ${error.message}`
        );
      }
    }
    return this.queryRunner.manager;
  }

  /**
   * Commit TypeORM transaction
   */
  protected async commitTransaction(
    transaction: EntityManager,
  ): Promise<void> {
    if (!this.queryRunner) { 
      throw new Error('Transaction not started');
    }
    await this.queryRunner.commitTransaction();
    await this.queryRunner.release();
    this.queryRunner = null;
  }

  /**
   * Rollback TypeORM transaction
   */
  protected async rollbackTransaction(
    transaction: EntityManager
  ) {
    if (!this.queryRunner) {
      throw Error('No active QueryRunner Found')
    }

    await this.queryRunner.rollbackTransaction();
    await this.queryRunner.release();
    this.queryRunner = null;
  }
}