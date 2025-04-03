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
   * 트랜잭션 객체 생성 (구현 클래스에서 오버라이드)
   */
  protected abstract createTransaction(options?: TransactionOptions): Promise<T>;

  /**
   * 트랜잭션 커밋 (구현 클래스에서 오버라이드)
   */
  protected abstract commitTransaction(transaction: T): Promise<void>;

  /**
   * 트랜잭션 롤백 (구현 클래스에서 오버라이드)
   */
  protected abstract rollbackTransaction(transaction: T): Promise<void>;

  /**
   * 새 트랜잭션 시작 또는 기존 트랜잭션 반환
   */
  async begin(options?: TransactionOptions): Promise<T> {
    const mergedOptions = { ...this.options, ...options };

    // 트랜잭션 전파 로직
    if (this.transaction) {
      switch (mergedOptions.propagation) {
        case TransactionPropagation.REQUIRES_NEW:
          // 항상 새 트랜잭션 생성 (중첩 트랜잭션)
          return this.createTransaction(mergedOptions);
        
        case TransactionPropagation.NOT_SUPPORTED:
        case TransactionPropagation.NEVER:
          throw new Error(`Transaction already active but propagation is ${mergedOptions.propagation}`);
        
        default:
          // 기존 트랜잭션 사용
          return this.transaction;
      }
    } else {
      // 트랜잭션이 없는 상태
      switch (mergedOptions.propagation) {
        case TransactionPropagation.MANDATORY:
          throw new Error('No existing transaction found for propagation MANDATORY');
        
        case TransactionPropagation.NOT_SUPPORTED:
        case TransactionPropagation.NEVER:
          // 트랜잭션 없이 진행
          return null as any;
        
        default:
          // 새 트랜잭션 생성
          this.transaction = await this.createTransaction(mergedOptions);
          return this.transaction;
      }
    }
  }

  /**
   * 현재 트랜잭션 커밋
   */
  async commit(): Promise<void> {
    if (!this.transaction) {
      throw new Error('No active transaction to commit');
    }

    await this.commitTransaction(this.transaction);
    this.transaction = null;
  }

  /**
   * 현재 트랜잭션 롤백
   */
  async rollback(): Promise<void> {
    if (!this.transaction) {
      throw new Error('No active transaction to rollback');
    }

    await this.rollbackTransaction(this.transaction);
    this.transaction = null;
  }

  /**
   * 현재 활성화된 트랜잭션 반환
   */
  async getTransaction(): Promise<T | null> {
    return this.transaction;
  }

  /**
   * 트랜잭션 활성화 여부 확인
   */
  isTransactionActive(): boolean {
    return this.transaction !== null;
  }

  /**
   * 콜백 함수를 트랜잭션 내에서 실행
   */
  async executeInTransaction<R>(
    callback: (transaction: T) => Promise<R>,
    options?: TransactionOptions,
  ): Promise<R> {
    const isOuterTransaction = !this.isTransactionActive();
    const transaction = await this.begin(options);
    
    try {
      const result = await callback(transaction);
      
      // 최상위 트랜잭션만 커밋
      if (isOuterTransaction) {
        await this.commit();
      }
      
      return result;
    } catch (error) {
      // 최상위 트랜잭션만 롤백
      if (isOuterTransaction && this.isTransactionActive()) {
        await this.rollback();
      }
      
      throw error;
    }
  }
}