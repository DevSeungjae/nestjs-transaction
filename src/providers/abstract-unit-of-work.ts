import { Injectable, Scope } from "@nestjs/common";
import {
  IUnitOfWork,
  TransactionOptions,
  TransactionPropagation
} from "../interfaces";

@Injectable({ scope: Scope.REQUEST })
export abstract class AbstractUnitOfWork<T = any> implements IUnitOfWork<T> {
  protected transaction: T | null = null;
  protected options: TransactionOptions = {
    propagation: TransactionPropagation.REQUIRED,
    readOnly: false,
  };

  /**
   * Create transaction object (override in implementation class)
   */
  protected abstract createTransaction(options?: TransactionOptions): Promise<T>;

  /**
   * Commit transaction (override in implementation class)
   */
  protected abstract commitTransaction(transaction: T): Promise<void>;

  /**
   * Rollback transaction (override in implementation class)
   */
  protected abstract rollbackTransaction(transaction: T): Promise<void>;

  /**
   * Start new transaction or return existing transaction
   */
  async begin(options?: TransactionOptions): Promise<T> {
    const mergedOptions = { ...this.options, ...options };

    // Transaction propagation logic
    if (this.transaction) {
      switch (mergedOptions.propagation) {
        case TransactionPropagation.REQUIRES_NEW:
          // Always create new transaction (nested transaction)
          return this.createTransaction(mergedOptions);
        
        case TransactionPropagation.NOT_SUPPORTED:
        case TransactionPropagation.NEVER:
          throw new Error(`Transaction already active but propagation is ${mergedOptions.propagation}`);
        
        default:
          // Use existing transaction
          return this.transaction;
      }
    } else {
      // No active transaction
      switch (mergedOptions.propagation) {
        case TransactionPropagation.MANDATORY:
          throw new Error('No existing transaction found for propagation MANDATORY');
        
        case TransactionPropagation.NOT_SUPPORTED:
        case TransactionPropagation.NEVER:
          // Proceed without transaction
          return null as any;
        
        default:
          // Create new transaction
          this.transaction = await this.createTransaction(mergedOptions);
          return this.transaction;
      }
    }
  }

  /**
   * Commit current transaction
   */
  async commit(): Promise<void> {
    if (!this.transaction) {
      throw new Error('No active transaction to commit');
    }

    await this.commitTransaction(this.transaction);
    this.transaction = null;
  }

  /**
   * Rollback current transaction
   */
  async rollback(): Promise<void> {
    if (!this.transaction) {
      throw new Error('No active transaction to rollback');
    }

    await this.rollbackTransaction(this.transaction);
    this.transaction = null;
  }

  /**
   * Get current active transaction
   */
  async getTransaction(): Promise<T | null> {
    return this.transaction;
  }

  /**
   * Check if transaction is active
   */
  isTransactionActive(): boolean {
    return this.transaction !== null;
  }

  /**
   * Execute callback function within transaction
   */
  async executeInTransaction<R>(
    callback: (transaction: T) => Promise<R>,
    options?: TransactionOptions,
  ): Promise<R> {
    const isOuterTransaction = !this.isTransactionActive();
    const transaction = await this.begin(options);
    
    try {
      const result = await callback(transaction);
      
      // Only commit outermost transaction
      if (isOuterTransaction) {
        await this.commit();
      }
      
      return result;
    } catch (error) {
      // Only rollback outermost transaction
      if (isOuterTransaction && this.isTransactionActive()) {
        await this.rollback();
      }
      
      throw error;
    }
  }
}