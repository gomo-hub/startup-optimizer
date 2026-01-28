import { Injectable, Logger } from '@nestjs/common';
import { ResourceSnapshot } from '../../domain/interfaces';

/**
 * Monitors system resources (CPU, Memory) to make loading decisions
 */
@Injectable()
export class ResourceMonitorService {
    private readonly logger = new Logger(ResourceMonitorService.name);
    private snapshots: ResourceSnapshot[] = [];
    private readonly maxSnapshots = 100;

    /**
     * Get current resource usage
     */
    getCurrentUsage(): ResourceSnapshot {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
        const externalMB = Math.round(memUsage.external / 1024 / 1024);

        const snapshot: ResourceSnapshot = {
            memoryUsagePercent: Math.round((heapUsedMB / heapTotalMB) * 100),
            heapUsedMB,
            heapTotalMB,
            externalMB,
            timestamp: new Date(),
        };

        this.addSnapshot(snapshot);
        return snapshot;
    }

    /**
     * Check if system has enough resources to load a module
     */
    canLoadModule(thresholdPercent: number = 80): boolean {
        const current = this.getCurrentUsage();
        const canLoad = current.memoryUsagePercent < thresholdPercent;

        if (!canLoad) {
            this.logger.warn(
                `Memory usage at ${current.memoryUsagePercent}% (threshold: ${thresholdPercent}%). Deferring module load.`
            );
        }

        return canLoad;
    }

    /**
     * Get average memory usage over last N snapshots
     */
    getAverageUsage(lastN: number = 10): number {
        const recentSnapshots = this.snapshots.slice(-lastN);
        if (recentSnapshots.length === 0) return 0;

        const sum = recentSnapshots.reduce((acc, s) => acc + s.memoryUsagePercent, 0);
        return Math.round(sum / recentSnapshots.length);
    }

    /**
     * Get memory trend (increasing, stable, decreasing)
     */
    getMemoryTrend(): 'increasing' | 'stable' | 'decreasing' {
        if (this.snapshots.length < 5) return 'stable';

        const recent = this.snapshots.slice(-5);
        const first = recent[0].memoryUsagePercent;
        const last = recent[recent.length - 1].memoryUsagePercent;
        const diff = last - first;

        if (diff > 10) return 'increasing';
        if (diff < -10) return 'decreasing';
        return 'stable';
    }

    /**
     * Log current resource status
     */
    logStatus(): void {
        const usage = this.getCurrentUsage();
        this.logger.log(
            `📊 Memory: ${usage.heapUsedMB}MB / ${usage.heapTotalMB}MB (${usage.memoryUsagePercent}%)`
        );
    }

    private addSnapshot(snapshot: ResourceSnapshot): void {
        this.snapshots.push(snapshot);
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots.shift();
        }
    }
}
