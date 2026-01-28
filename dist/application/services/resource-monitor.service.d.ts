import { ResourceSnapshot } from '../../domain/interfaces';
export declare class ResourceMonitorService {
    private readonly logger;
    private snapshots;
    private readonly maxSnapshots;
    getCurrentUsage(): ResourceSnapshot;
    canLoadModule(thresholdPercent?: number): boolean;
    getAverageUsage(lastN?: number): number;
    getMemoryTrend(): 'increasing' | 'stable' | 'decreasing';
    logStatus(): void;
    private addSnapshot;
}
