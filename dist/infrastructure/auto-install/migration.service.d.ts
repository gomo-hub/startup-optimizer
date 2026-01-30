import { OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
export declare class MigrationService implements OnModuleInit {
    private readonly dataSource;
    private readonly logger;
    private readonly migrationsPath;
    private readonly MODULE_NAME;
    private readonly SCHEMA_NAME;
    private readonly LOCK_ID;
    constructor(dataSource: DataSource);
    onModuleInit(): Promise<void>;
    runMigrations(): Promise<void>;
    private ensureSchemaExists;
    private ensureMigrationsTable;
    private getAvailableMigrations;
    private getExecutedMigrations;
    private calculateChecksum;
    private executeMigration;
}
