# nestjs-transaction

A declarative transaction management library for NestJS

[![NPM Version](https://img.shields.io/npm/v/nestjs-transaction.svg)](https://www.npmjs.com/package/nestjs-transaction)
[![License](https://img.shields.io/npm/l/nestjs-transaction.svg)](LICENSE)

## Overview

`nestjs-transaction` is a library that enables declarative database transaction management in NestJS applications. It uses decorators and AOP (Aspect-Oriented Programming) approach to separate transaction management code from business logic.

## Key Features

- 🎯 **Declarative Transactions**: Use `@Transactional()` decorator to specify that a method should run within a transaction
- 💉 **Automatic Transaction Injection**: Automatically inject transaction objects as method parameters using `@Transaction()` decorator
- 🔄 **Transaction Propagation Support**: Support for various transaction propagation options like REQUIRED, REQUIRES_NEW, SUPPORTS
- 🛡️ **Isolation Level Settings**: Support for various isolation levels from READ_UNCOMMITTED to SERIALIZABLE
- ⏱️ **Timeout Management**: Prevent deadlocks with transaction timeout settings
- 📚 **Multiple Drivers**: Support for various database drivers like Knex, TypeORM, Prisma (currently only Knex is implemented)
- 🌐 **Multiple Database Connections**: Support for transaction management across multiple database connections

## Installation

```bash
npm install nestjs-transaction --save
```

## Quick Start

### 1. Module Configuration

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { KnexModule } from 'nest-knexjs';
import { KnexTransactionModule } from 'nestjs-transaction';

@Module({
  imports: [
    KnexModule.forRoot({
      config: {
        client: 'pg',
        connection: {
          /* Database connection information */
        },
      },
    }),
    
    KnexTransactionModule.forRoot({
      connection: 'KNEX_CONNECTION',
      global: true,
    }),
    
    // Other modules
  ],
})
export class AppModule {}
```

### 2. Using Transactions

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { Transactional, Transaction } from 'nestjs-transaction';
import { Knex } from 'knex';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: any) {}
  
  @Transactional()
  async createUser(userData: any, @Transaction() trx: Knex.Transaction): Promise {
    const userId = await this.userRepository.create(userData, trx);
    return this.userRepository.findById(userId, trx);
  }
}
```

### 3. Advanced Options

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { 
  Transactional, 
  Transaction,
  TransactionPropagation,
  IsolationLevel
} from 'nestjs-transaction';
import { Knex } from 'knex';

@Injectable()
export class UserService {
  @Transactional({
    propagation: TransactionPropagation.REQUIRES_NEW,
    isolation: IsolationLevel.SERIALIZABLE,
    timeout: 10000,
    readOnly: true
  })
  async getReports(@Transaction() trx: Knex.Transaction): Promise {
    // Perform read-only operations within transaction
    return this.reportRepository.findAll(trx);
  }
}
```

## API Reference

### Decorators

- `@Transactional(options?)`: Specifies that a method should run within a transaction
- `@Transaction()`: Injects a transaction object as a method parameter

### Transaction Options

```typescript
export interface TransactionOptions {
  propagation?: TransactionPropagation;
  isolation?: IsolationLevel;
  timeout?: number;
  readOnly?: boolean;
}
```

### Transaction Propagation Options

- `REQUIRED`: Transaction is required, use existing one if available, create new if not (default)
- `REQUIRES_NEW`: Always create a new transaction
- `SUPPORTS`: Use transaction if available, proceed without if not
- `NOT_SUPPORTED`: Execute without transaction
- `NEVER`: Throw exception if executed within a transaction
- `MANDATORY`: Transaction must exist, throw exception if not

### Isolation Levels

- `READ_UNCOMMITTED`: Can read uncommitted data (dirty reads possible)
- `READ_COMMITTED`: Can only read committed data (non-repeatable reads possible)
- `REPEATABLE_READ`: Same query within transaction always returns same result (phantom reads possible)
- `SERIALIZABLE`: Most strict isolation level, ensures results as if all transactions executed sequentially
- `SNAPSHOT`: Special isolation level supported by some databases (e.g., MSSQL), provides optimistic concurrency control

Each database driver and DBMS may support different isolation levels. For example:
- SQLite does not support isolation levels.
- PostgreSQL supports `READ UNCOMMITTED` but promotes it to `READ COMMITTED`.
- Oracle only supports `READ COMMITTED` and `SERIALIZABLE`.

This library automatically maps the specified isolation level to the appropriate level for each database, and uses the default isolation level with a warning log when an unsupported level is specified.

## License

MIT