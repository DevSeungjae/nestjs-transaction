import { Knex } from 'knex';
import { IsolationLevel } from '../../interfaces';

const DB_ISOLATION_SUPPORT: Record<string, IsolationLevel[]> = {
  mysql: [
    IsolationLevel.READ_UNCOMMITTED,
    IsolationLevel.READ_COMMITTED,
    IsolationLevel.REPEATABLE_READ,
    IsolationLevel.SERIALIZABLE,
  ],
  mysql2: [
    IsolationLevel.READ_UNCOMMITTED,
    IsolationLevel.READ_COMMITTED,
    IsolationLevel.REPEATABLE_READ,
    IsolationLevel.SERIALIZABLE,
  ],
  pg: [
    IsolationLevel.READ_COMMITTED,
    IsolationLevel.REPEATABLE_READ,
    IsolationLevel.SERIALIZABLE,
  ],
  
  mssql: [
    IsolationLevel.READ_UNCOMMITTED,
    IsolationLevel.READ_COMMITTED,
    IsolationLevel.REPEATABLE_READ,
    IsolationLevel.SERIALIZABLE,
    IsolationLevel.SNAPSHOT,
  ],
  oracledb: [
    IsolationLevel.READ_COMMITTED,
    IsolationLevel.SERIALIZABLE,
  ],
  sqlite3: [
    
  ]
}

/**
 * Check if the given isolation level is supported by the database client
 * @param client - Knex client instance
 * @param isolationLevel - Isolation level to check
 * @returns True if the isolation level is supported, false otherwise
 */

export function isIsolationLevelSupported(
  client: Knex,
  isolationLevel: IsolationLevel,
): boolean {
  const clientName = client.client.config.client;
  const supportedLevels = DB_ISOLATION_SUPPORT[clientName] || [];
  return supportedLevels.includes(isolationLevel);
}

/**
 * Get all supported isolation levels for the given database client
 * @param client - Knex client instance
 * @returns Array of supported isolation levels
 */
export function getSupportedIsolationLevels(client: Knex): IsolationLevel[] {
  const clientName = client.client.config.client;
  return DB_ISOLATION_SUPPORT[clientName] || [];
}

export function mapIsolationLevelForDriver(
  client: Knex,
  isolation: IsolationLevel,
): Knex.IsolationLevels | undefined {
  if (!isIsolationLevelSupported(client, isolation)) {
    console.warn(
      `Isolation Level ${isolation} is not supported by ${client.client.config.client}. Falling back to default.`,
    );
    return undefined;
  }

  switch (isolation) {
    case IsolationLevel.READ_UNCOMMITTED:
      return 'read uncommitted';
    case IsolationLevel.READ_COMMITTED:
      return 'read committed';
    case IsolationLevel.REPEATABLE_READ:
      return 'repeatable read';
    case IsolationLevel.SERIALIZABLE:
      return 'serializable';
    case IsolationLevel.SNAPSHOT:
      return 'snapshot';
    default:
      return undefined;
  }
}