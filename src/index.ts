// Module
export { StartupOptimizerModule } from './startup-optimizer.module';

// Domain - Interfaces
export {
    ModuleTier,
    ModuleRegistration,
    ResourceSnapshot,
    SystemMemoryInfo,
    StartupOptimizerOptions,
    StartupOptimizerAsyncOptions,
} from './domain/interfaces';

// Domain - Entities
export { ModuleUsage } from './domain/entities';

// Application - Services
export {
    ModuleOrchestratorService,
    TierManagerService,
    ResourceMonitorService,
    AutoDiscoveryService,
    PreloadStrategyService,
    UsagePatternService,
    TierManagementService,
} from './application/services';

// Service interfaces
export {
    PreloadResult,
    PreloadMetrics,
} from './application/services/preload-strategy.service';

export {
    ModuleUsageStats,
    UsagePatterns,
    ModuleSequence,
} from './application/services/usage-pattern.service';

export {
    TierAnalysis,
    PreloadResponse,
    PromotionResult,
    ModuleStatus,
} from './application/services/tier-management.service';

// Application - Tools (for AI Agents)
export { TierOptimizerTool, TierOptimizerInput, TierOptimizerResult } from './application/tools';

// Application - Interceptors
export {
    UsageTrackingInterceptor,
    RuntimeLoaderInterceptor,
} from './application/interceptors';

// Constants
export { STARTUP_OPTIMIZER_OPTIONS } from './infrastructure/constants';
