import { OnModuleInit } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { Repository } from 'typeorm';
import { ModuleUsage } from '../../domain/entities';
import { TierManagerService } from './tier-manager.service';
export declare class AutoDiscoveryService implements OnModuleInit {
    private readonly modulesContainer;
    private readonly tierManager;
    private readonly usageRepository;
    private readonly logger;
    private readonly LEARNING_WINDOW_DAYS;
    private readonly PROMOTION_THRESHOLD;
    private readonly DEMOTION_THRESHOLD;
    constructor(modulesContainer: ModulesContainer, tierManager: TierManagerService, usageRepository: Repository<ModuleUsage>);
    onModuleInit(): Promise<void>;
    private discoverAndRegisterModules;
    private applyLearnedTiers;
    private calculateOptimalTier;
    private demoteUnusedModules;
    private isAuthCriticalModule;
    trackModuleAccess(moduleName: string, route: string, loadTimeMs: number, orgId?: string): Promise<void>;
    relearn(): Promise<{
        promoted: string[];
        demoted: string[];
    }>;
    private getModuleName;
    private isInternalModule;
}
