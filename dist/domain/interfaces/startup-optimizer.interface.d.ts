export declare enum ModuleTier {
    INSTANT = 0,
    ESSENTIAL = 1,
    BACKGROUND = 2,
    LAZY = 3,
    DORMANT = 4
}
export interface ModuleRegistration {
    module: any;
    tier: ModuleTier;
    name: string;
    dependencies?: string[];
    routes?: string[];
    loaded?: boolean;
    loadedAt?: Date;
}
export interface ResourceSnapshot {
    memoryUsagePercent: number;
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
    timestamp: Date;
}
export interface SystemMemoryInfo {
    totalMB: number;
    freeMB: number;
    usedMB: number;
    usagePercent: number;
}
export interface StartupOptimizerOptions {
    tiers?: {
        instant?: any[];
        essential?: any[];
        background?: any[];
        lazy?: any[];
        dormant?: any[];
    };
    enableDemandPrediction?: boolean;
    resourceMonitoring?: boolean;
    memoryThreshold?: number;
    backgroundDelay?: number;
    debug?: boolean;
    schema?: string;
}
export interface StartupOptimizerAsyncOptions {
    imports?: any[];
    inject?: any[];
    useFactory: (...args: any[]) => Promise<StartupOptimizerOptions> | StartupOptimizerOptions;
}
