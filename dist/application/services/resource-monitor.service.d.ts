import { ResourceSnapshot, SystemMemoryInfo } from '../../domain/interfaces';
export declare class ResourceMonitorService {
    private readonly logger;
    private snapshots;
    private readonly maxSnapshots;
    private readonly HIGH_FREE_MEMORY_MB;
    private readonly LOW_FREE_MEMORY_MB;
    getCurrentUsage(): ResourceSnapshot;
    getSystemMemory(): SystemMemoryInfo;
    calculateDynamicThreshold(): number;
    canLoadModule(thresholdPercent?: number): boolean;
    canLoadModuleDynamic(): boolean;
    getAverageUsage(lastN?: number): number;
    getMemoryTrend(): 'increasing' | 'stable' | 'decreasing';
    logStatus(): void;
    private addSnapshot;
}
