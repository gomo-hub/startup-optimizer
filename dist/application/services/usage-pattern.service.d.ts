import { StartupOptimizerOptions } from '../../domain/interfaces';
export declare class UsagePatternService {
    private readonly options?;
    private readonly logger;
    private moduleStats;
    private accessSequence;
    private readonly maxSequenceLength;
    constructor(options?: StartupOptimizerOptions | undefined);
    recordAccess(moduleName: string, responseTimeMs: number, orgId?: string): void;
    getPatterns(): UsagePatterns;
    private detectSequences;
    getPreloadRecommendation(accessedModule: string): string[];
    getAllStats(): Map<string, ModuleUsageStats>;
    importStats(stats: Map<string, ModuleUsageStats>): void;
    clearStats(): void;
    private createEmptyStats;
    private updateAverage;
}
export interface ModuleUsageStats {
    moduleName: string;
    totalAccesses: number;
    avgResponseTimeMs: number;
    lastAccessedAt: Date;
    accessByHour: Record<number, number>;
    accessByOrg: Record<string, number>;
}
export interface UsagePatterns {
    timestamp: Date;
    currentHour: number;
    topModules: Array<{
        module: string;
        totalAccesses: number;
        avgResponseTimeMs: number;
    }>;
    hotAtThisHour: Array<{
        module: string;
        accessesAtHour: number;
        percentOfTotal: number;
    }>;
    coldModules: string[];
    sequences: ModuleSequence[];
}
export interface ModuleSequence {
    fromModule: string;
    toModule: string;
    occurrences: number;
    confidence: number;
}
