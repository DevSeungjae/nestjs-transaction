import { TransactionOptions } from "./transaction-manager.interface";


export interface IUnitOfWork<T = any> {
  begin(options?: TransactionOptions): Promise<T>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  getTransaction(): Promise<T | null>;
  isTransactionActive(): boolean;
  executeInTransaction<R>(
    callback: (transaction: T) => Promise<R>,
    options?: TransactionOptions,
  ): Promise<R>;
}