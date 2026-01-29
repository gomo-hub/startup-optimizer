/**
 * Module loading tiers for Progressive Module Architecture
 * 
 * INSTANT:    Loads during bootstrap (Auth, Config, Health)
 * ESSENTIAL:  Loads immediately after listen() (Database, Cache)
 * BACKGROUND: Loads async after 2s delay (Payments, Cart)
 * LAZY:       Loads only when route is accessed (VideoComposer, VSL)
 * DORMANT:    Never loads unless explicitly requested (unused features)
 */
export enum ModuleTier {
    INSTANT = 0,
    ESSENTIAL = 1,
    BACKGROUND = 2,
    LAZY = 3,
    DORMANT = 4,
}

/**
 * Metadata for a registered module
 */
export interface ModuleRegistration {
    /** Module class reference */
    module: any;

    /** Loading tier */
    tier: ModuleTier;

    /** Unique identifier */
    name: string;

    /** Dependencies (other module names that must load first) */
    dependencies?: string[];

    /** Routes that trigger lazy loading for this module */
    routes?: string[];

    /** Whether module is currently loaded */
    loaded?: boolean;

    /** Load timestamp */
    loadedAt?: Date;
}

/**
 * Current resource usage snapshot
 */
export interface ResourceSnapshot {
    /** Memory usage percentage (0-100) */
    memoryUsagePercent: number;

    /** Heap used in MB */
    heapUsedMB: number;

    /** Heap total in MB */
    heapTotalMB: number;

    /** External memory in MB */
    externalMB: number;

    /** Timestamp */
    timestamp: Date;
}

/**
 * System-level memory information
 */
export interface SystemMemoryInfo {
    /** Total system RAM in MB */
    totalMB: number;

    /** Free system RAM in MB */
    freeMB: number;

    /** Used system RAM in MB */
    usedMB: number;

    /** Usage percentage (0-100) */
    usagePercent: number;
}

/**
 * Configuration for StartupOptimizerModule
 */
export interface StartupOptimizerOptions {
    /** Module registrations by tier */
    tiers?: {
        instant?: any[];
        essential?: any[];
        background?: any[];
        lazy?: any[];
        dormant?: any[];
    };

    /** Enable demand prediction based on tenant usage */
    enableDemandPrediction?: boolean;

    /** Enable resource monitoring */
    resourceMonitoring?: boolean;

    /** Memory threshold (%) to defer non-essential modules */
    memoryThreshold?: number;

    /** Delay (ms) before loading BACKGROUND tier */
    backgroundDelay?: number;

    /** Enable debug logging */
    debug?: boolean;

    /** Database schema for usage tracking */
    schema?: string;
}

/**
 * Async module options (for forRootAsync)
 */
export interface StartupOptimizerAsyncOptions {
    imports?: any[];
    inject?: any[];
    useFactory: (...args: any[]) => Promise<StartupOptimizerOptions> | StartupOptimizerOptions;
}
