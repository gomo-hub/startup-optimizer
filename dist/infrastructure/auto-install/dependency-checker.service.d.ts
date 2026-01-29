import { DataSource } from 'typeorm';
export declare class DependencyCheckerService {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    verify(): Promise<void>;
    private checkDatabaseConnection;
    private checkRequiredExtensions;
    isModuleInstalled(moduleName: string): Promise<boolean>;
    waitForModule(moduleName: string, maxWaitMs?: number): Promise<boolean>;
    getStatus(): Promise<{
        database: boolean;
        extensions: string[];
        migrations: number;
    }>;
}
