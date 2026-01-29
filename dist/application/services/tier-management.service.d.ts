import { ModuleOrchestratorService } from './module-orchestrator.service';
import { PreloadStrategyService } from './preload-strategy.service';
import { UsagePatternService, UsagePatterns } from './usage-pattern.service';
import { TierManagerService } from './tier-manager.service';
import { StartupOptimizerOptions } from '../../domain/interfaces';
export declare class TierManagementService {
    private readonly orchestrator;
    private readonly preloadStrategy;
    private readonly usagePatterns;
    private readonly tierManager;
    private readonly options?;
    private readonly logger;
    constructor(orchestrator: ModuleOrchestratorService, preloadStrategy: PreloadStrategyService, usagePatterns: UsagePatternService, tierManager: TierManagerService, options?: StartupOptimizerOptions | undefined);
    analyzePatterns(): Promise<TierAnalysis>;
    preloadModules(moduleNames: string[]): Promise<PreloadResponse>;
    promoteModule(moduleName: string): Promise<PromotionResult>;
    getModuleStatus(moduleName: string): ModuleStatus;
    getAllModuleStatuses(): ModuleStatus[];
    getOptimizationContext(): string;
    private generateRecommendations;
    private inferTier;
}
export interface TierAnalysis {
    timestamp: Date;
    patterns: UsagePatterns;
    preloadMetrics: {
        totalPreloads: number;
        usedPreloads: number;
        unusedPreloads: number;
        hitRate: number;
        avgTimeToUseMs: number;
    };
    recommendations: string[];
}
export interface PreloadResponse {
    success: boolean;
    loaded: string[];
    alreadyLoaded: string[];
    failed: string[];
    totalLoadTimeMs: number;
}
export interface PromotionResult {
    success: boolean;
    moduleName: string;
    wasAlreadyLoaded: boolean;
    loadTimeMs: number;
    message: string;
}
export interface ModuleStatus {
    moduleName: string;
    isLoaded: boolean;
    tier: string;
    stats: {
        totalAccesses: number;
        avgResponseTimeMs: number;
        lastAccessedAt: Date;
    } | null;
}
