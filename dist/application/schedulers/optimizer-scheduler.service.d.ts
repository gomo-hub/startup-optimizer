import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PersistenceService } from '../../infrastructure/persistence';
import { TierManagementService } from '../services/tier-management.service';
import { UsagePatternService } from '../services/usage-pattern.service';
export declare class OptimizerSchedulerService implements OnModuleInit, OnModuleDestroy {
    private readonly persistence;
    private readonly tierManagement;
    private readonly usagePattern;
    private readonly logger;
    private isEnabled;
    private hourlyTimer;
    private sixHourTimer;
    private fifteenMinTimer;
    private dailyTimer;
    constructor(persistence: PersistenceService, tierManagement: TierManagementService, usagePattern: UsagePatternService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    setEnabled(enabled: boolean): void;
    private startTimers;
    private stopTimers;
    classifyModulesHourly(): Promise<void>;
    analyzeAndPreload(): Promise<void>;
    validateRecentDecisions(): Promise<void>;
    dailyCleanup(): Promise<void>;
    generateWeeklyReport(): Promise<{
        total: number;
        validated: number;
        effective: number;
        effectivenessRate: number;
        avgTimeToUseMs: number;
    }>;
}
