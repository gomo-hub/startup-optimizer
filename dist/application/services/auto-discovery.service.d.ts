import { OnModuleInit } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { TierManagerService } from './tier-manager.service';
export declare class AutoDiscoveryService implements OnModuleInit {
    private readonly modulesContainer;
    private readonly tierManager;
    private readonly logger;
    constructor(modulesContainer: ModulesContainer, tierManager: TierManagerService);
    onModuleInit(): Promise<void>;
    private discoverAndRegisterModules;
    private determineTier;
    private getModuleName;
    private isInternalModule;
    getDiscoveredModules(): string[];
}
