import { OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DependencyCheckerService } from './dependency-checker.service';
import { MigrationService } from './migration.service';
export declare class AutoInstallService implements OnModuleInit {
    private readonly dataSource;
    private readonly dependencyChecker;
    private readonly migrationService;
    private readonly logger;
    constructor(dataSource: DataSource, dependencyChecker: DependencyCheckerService, migrationService: MigrationService);
    onModuleInit(): Promise<void>;
    install(): Promise<void>;
    private verifyIntegrity;
    getStatus(): Promise<{
        installed: boolean;
        database: boolean;
        extensions: string[];
        migrations: number;
    }>;
}
