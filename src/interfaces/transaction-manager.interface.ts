export enum TransactionPropagation {
  REQUIRED = 'REQUIRED', // Transaction required, use existing if present, create new if not
  REQUIRES_NEW = 'REQUIRES_NEW', // Always create new transaction
  SUPPORTS = 'SUPPORTS', // Use transaction if exists, proceed without if none
  NOT_SUPPORTED = 'NOT_SUPPORTED', // Execute without transaction
  NEVER = 'NEVER', // Throw exception if executed within transaction
  MANDATORY = 'MANDATORY', // Transaction must exist, throw exception if none
}

export enum IsolationLevel {
  READ_UNCOMMITTED = 'READ UNCOMMITTED',
  READ_COMMITTED = 'READ COMMITTED',
  REPEATABLE_READ = 'REPEATABLE READ',
  SERIALIZABLE = 'SERIALIZABLE',
}

export interface TransactionOptions {
  propagation?: TransactionPropagation;
  isolation?: IsolationLevel;
  timeout?: number; // 트랜잭션 타임아웃 (밀리초)
  readOnly?: boolean;
}

