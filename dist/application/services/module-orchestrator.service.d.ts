import { OnApplicationBootstrap } from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';
import { ModuleTier, ModuleRegistration, StartupOptimizerOptions } from '../../domain/interfaces';
import { TierManagerService } from './tier-manager.service';
import { ResourceMonitorService } from './resource-monitor.service';
export declare class ModuleOrchestratorService implements OnApplicationBootstrap {
    private readonly lazyLoader;
    private readonly tierManager;
    private readonly resourceMonitor;
    private readonly logger;
    private options;
    private bootstrapComplete;
    constructor(lazyLoader: LazyModuleLoader, tierManager: TierManagerService, resourceMonitor: ResourceMonitorService);
    configure(options: StartupOptimizerOptions): void;
    onApplicationBootstrap(): Promise<void>;
    loadTier(tier: ModuleTier): Promise<void>;
    loadModule(registration: ModuleRegistration): Promise<boolean>;
    ensureLoaded(moduleName: string): Promise<boolean>;
    isLoaded(moduleName: string): boolean;
    ensureLoadedForRoute(route: string): Promise<boolean>;
    private loadBackgroundTier;
    private registerTiers;
    getStats(): {
        modules: {
            total: number;
            loaded: number;
            byTier: Record<string, number>;
        };
        resources: import("../../domain/interfaces").ResourceSnapshot;
        bootstrapComplete: boolean;
    };
}
