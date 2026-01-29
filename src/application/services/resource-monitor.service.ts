import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';
import { ResourceSnapshot, SystemMemoryInfo } from '../../domain/interfaces';

/**
 * Monitors system resources (CPU, Memory) to make loading decisions
 * Uses dynamic memory management based on free system RAM
 */
@Injectable()
export class ResourceMonitorService {
    private readonly logger = new Logger(ResourceMonitorService.name);
    private snapshots: ResourceSnapshot[] = [];
    private readonly maxSnapshots = 100;

    // Dynamic thresholds (in MB)
    private readonly HIGH_FREE_MEMORY_MB = 500;  // Above this = aggressive loading
    private readonly LOW_FREE_MEMORY_MB = 200;   // Below this = conservative loading

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
     * Get system-level memory information (total and free RAM)
     */
    getSystemMemory(): SystemMemoryInfo {
        const totalMB = Math.round(os.totalmem() / 1024 / 1024);
        const freeMB = Math.round(os.freemem() / 1024 / 1024);
        const usedMB = totalMB - freeMB;
        const usagePercent = Math.round((usedMB / totalMB) * 100);

        return { totalMB, freeMB, usedMB, usagePercent };
    }

    /**
     * Calculate dynamic threshold based on system memory
     * 
     * NOTE: os.freemem() is misleading on macOS - it shows only "wired inactive" memory,
     * not including reclaimable cache. On a 32GB Mac, it often shows <100MB "free".
     * 
     * Strategy: Use TOTAL system RAM as indicator of capacity:
     * - Total RAM >= 16GB → aggressive loading (threshold 98%)
     * - Total RAM >= 8GB  → normal loading (threshold 95%)
     * - Total RAM < 8GB   → conservative loading (threshold 85%)
     * 
     * This ensures modern development machines don't defer modules unnecessarily.
     */
    calculateDynamicThreshold(): number {
        const { totalMB, freeMB } = this.getSystemMemory();

        // Safety check: if free RAM > 2GB, always allow aggressive loading
        if (freeMB > 2000) {
            return 98;
        }

        // Use total RAM as capacity indicator (macOS freemem is unreliable)
        if (totalMB >= 16000) {
            return 98; // 16GB+ RAM - load everything
        } else if (totalMB >= 8000) {
            return 95; // 8GB+ RAM - normal loading
        } else {
            return 85; // <8GB RAM - be somewhat conservative
        }
    }

    /**
     * Check if system has enough resources to load a module (LEGACY - fixed threshold)
     * @deprecated Use canLoadModuleDynamic() instead
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
     * Check if system has enough resources to load a module (DYNAMIC)
     * Uses free system RAM to determine if loading is safe
     */
    canLoadModuleDynamic(): boolean {
        const current = this.getCurrentUsage();
        const systemMem = this.getSystemMemory();
        const dynamicThreshold = this.calculateDynamicThreshold();
        const canLoad = current.memoryUsagePercent < dynamicThreshold;

        if (!canLoad) {
            this.logger.warn(
                `⚠️ Memory constrained: Heap ${current.memoryUsagePercent}% (threshold: ${dynamicThreshold}%), ` +
                `System free: ${systemMem.freeMB}MB. Deferring module load.`
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
     * Log current resource status (includes system memory)
     */
    logStatus(): void {
        const usage = this.getCurrentUsage();
        const systemMem = this.getSystemMemory();
        this.logger.log(
            `📊 Heap: ${usage.heapUsedMB}MB / ${usage.heapTotalMB}MB (${usage.memoryUsagePercent}%) | ` +
            `System: ${systemMem.freeMB}MB free / ${systemMem.totalMB}MB total`
        );
    }

    private addSnapshot(snapshot: ResourceSnapshot): void {
        this.snapshots.push(snapshot);
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots.shift();
        }
    }
}
