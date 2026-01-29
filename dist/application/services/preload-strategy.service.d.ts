import { ModuleOrchestratorService } from './module-orchestrator.service';
import { StartupOptimizerOptions } from '../../domain/interfaces';
export declare class PreloadStrategyService {
    private readonly orchestrator;
    private readonly options?;
    private readonly logger;
    private preloadHistory;
    constructor(orchestrator: ModuleOrchestratorService, options?: StartupOptimizerOptions | undefined);
    preloadPredicted(moduleNames: string[]): Promise<PreloadResult[]>;
    preloadModule(moduleName: string): Promise<PreloadResult>;
    markAsUsed(moduleName: string): void;
    getPreloadMetrics(): PreloadMetrics;
    clearHistory(): void;
}
export interface PreloadResult {
    moduleName: string;
    success: boolean;
    alreadyLoaded: boolean;
    loadTimeMs: number;
}
export interface PreloadMetrics {
    totalPreloads: number;
    usedPreloads: number;
    unusedPreloads: number;
    hitRate: number;
    avgTimeToUseMs: number;
}
