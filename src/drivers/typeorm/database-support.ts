import { IsolationLevel } from "src/interfaces";
import { DataSource } from "typeorm";
import { IsolationLevel as TypeOrmIsolationLevelType } from "typeorm/driver/types/IsolationLevel";

/**
 * Supported isolation levels by database type
 */
const DB_ISOLATION_SUPPORT: Record<string, IsolationLevel[]> = {
  mysql: [
    IsolationLevel.READ_UNCOMMITTED,
    IsolationLevel.READ_COMMITTED,
    IsolationLevel.REPEATABLE_READ,
    IsolationLevel.SERIALIZABLE
  ],
  mariadb: [
    IsolationLevel.READ_UNCOMMITTED,
    IsolationLevel.READ_COMMITTED,
    IsolationLevel.REPEATABLE_READ,
    IsolationLevel.SERIALIZABLE
  ],
  postgres: [
    IsolationLevel.READ_COMMITTED,
    IsolationLevel.REPEATABLE_READ,
    IsolationLevel.SERIALIZABLE
  ],
  cockroachdb: [
    IsolationLevel.SERIALIZABLE
  ],
  mssql: [
    IsolationLevel.READ_UNCOMMITTED,
    IsolationLevel.READ_COMMITTED,
    IsolationLevel.REPEATABLE_READ,
    IsolationLevel.SERIALIZABLE,
    IsolationLevel.SNAPSHOT
  ],
  oracle: [
    IsolationLevel.READ_COMMITTED,
    IsolationLevel.SERIALIZABLE
  ],
  sqlite: []
}

/**
 * Check if the isolation level is supported by the database
 * @param dataSource - TypeORM DataSource
 * @param isolationLevel - Isolation level to check
 * @returns True if the isolation level is supported, false otherwise
 */
export function isIsolationLevelSupported(
  dataSource: DataSource,
  isolationLevel: IsolationLevel,
): boolean {
  const driverType = dataSource.driver.options.type as string;
  const supportedLevels = DB_ISOLATION_SUPPORT[driverType];
  return supportedLevels.includes(isolationLevel);
}

/**
 * Get supported isolation levels by database type
 * @param dataSource - TypeORM DataSource
 * @returns Supported isolation levels
 */
export function getSupportedIsolationLevels(dataSource: DataSource): IsolationLevel[] {
  const driverType = dataSource.driver.options.type as string;
  return DB_ISOLATION_SUPPORT[driverType];
}

export function mapIsolationLevelForDriver(
  dataSource: DataSource,
  isolationLevel: IsolationLevel,
): TypeOrmIsolationLevelType | undefined {
  if (!isIsolationLevelSupported(dataSource, isolationLevel)) {
    // TODO : Change to logger
    console.warn(
      `Isolation level ${isolationLevel} is not supported in ${dataSource.driver.options.type}. Falling back to default.`
    );
    return undefined;
  }
  
  // Isolation level mapping
  switch (isolationLevel) {
    case IsolationLevel.READ_UNCOMMITTED:
      return 'READ UNCOMMITTED';
    case IsolationLevel.READ_COMMITTED:
      return 'READ COMMITTED';
    case IsolationLevel.REPEATABLE_READ:
      return 'REPEATABLE READ';
    case IsolationLevel.SERIALIZABLE:
      return 'SERIALIZABLE';
    default:
      return undefined;
  }
}




