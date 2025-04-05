import { SetMetadata } from '@nestjs/common';
import { TransactionOptions } from '../interfaces';
import { TRANSACTION_METADATA_KEY } from '../providers';

/**
 * Decorator that marks a method to be executed within a transaction
 * @param options Transaction options
 */
export const Transactional = (options?: TransactionOptions) => 
  SetMetadata(TRANSACTION_METADATA_KEY, options || {});