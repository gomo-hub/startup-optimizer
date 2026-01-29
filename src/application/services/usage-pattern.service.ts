import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { STARTUP_OPTIMIZER_OPTIONS } from '../../infrastructure/constants';
import { StartupOptimizerOptions } from '../../domain/interfaces';

/**
 * 📊 Usage Pattern Service
 * 
 * Collects and analyzes module usage patterns for AI-driven optimization.
 * Tracks access frequency, timing, and sequences to predict future usage.
 */
@Injectable()
export class UsagePatternService {
    private readonly logger = new Logger(UsagePatternService.name);

    // In-memory usage stats (can be persisted to Redis/DB)
    private moduleStats: Map<string, ModuleUsageStats> = new Map();

    // Access sequences for pattern detection
    private accessSequence: Array<{ module: string; timestamp: Date }> = [];
    private readonly maxSequenceLength = 1000;

    constructor(
        @Optional() @Inject(STARTUP_OPTIMIZER_OPTIONS)
        private readonly options?: StartupOptimizerOptions,
    ) { }

    /**
     * Record a module access
     */
    recordAccess(moduleName: string, responseTimeMs: number, orgId?: string): void {
        // Update module stats
        let stats = this.moduleStats.get(moduleName);
        if (!stats) {
            stats = this.createEmptyStats(moduleName);
            this.moduleStats.set(moduleName, stats);
        }

        stats.totalAccesses++;
        stats.lastAccessedAt = new Date();
        stats.avgResponseTimeMs = this.updateAverage(
            stats.avgResponseTimeMs,
            responseTimeMs,
            stats.totalAccesses
        );

        // Track hourly access pattern
        const hour = new Date().getHours();
        stats.accessByHour[hour] = (stats.accessByHour[hour] || 0) + 1;

        // Track org-specific usage
        if (orgId) {
            stats.accessByOrg[orgId] = (stats.accessByOrg[orgId] || 0) + 1;
        }

        // Add to sequence for pattern detection
        this.accessSequence.push({ module: moduleName, timestamp: new Date() });
        if (this.accessSequence.length > this.maxSequenceLength) {
            this.accessSequence.shift();
        }
    }

    /**
     * Get usage patterns for AI analysis
     */
    getPatterns(): UsagePatterns {
        const now = new Date();
        const currentHour = now.getHours();

        // Find most accessed modules
        const modulesByAccess = [...this.moduleStats.entries()]
            .sort((a, b) => b[1].totalAccesses - a[1].totalAccesses);

        // Find modules that are typically accessed at this hour
        const hotAtThisHour = modulesByAccess
            .filter(([_, stats]) => (stats.accessByHour[currentHour] || 0) > 0)
            .map(([name, stats]) => ({
                module: name,
                accessesAtHour: stats.accessByHour[currentHour] || 0,
                percentOfTotal: Math.round(
                    ((stats.accessByHour[currentHour] || 0) / stats.totalAccesses) * 100
                ),
            }));

        // Detect access sequences (A → B patterns)
        const sequences = this.detectSequences();

        // Find cold modules (never or rarely accessed)
        const coldModules = modulesByAccess
            .filter(([_, stats]) => stats.totalAccesses < 5)
            .map(([name]) => name);

        return {
            timestamp: now,
            currentHour,
            topModules: modulesByAccess.slice(0, 10).map(([name, stats]) => ({
                module: name,
                totalAccesses: stats.totalAccesses,
                avgResponseTimeMs: stats.avgResponseTimeMs,
            })),
            hotAtThisHour,
            coldModules,
            sequences,
        };
    }

    /**
     * Detect access sequences (if A is accessed, B is often accessed next)
     */
    private detectSequences(): ModuleSequence[] {
        const sequenceMap: Map<string, Map<string, number>> = new Map();
        const windowMs = 60000; // 1 minute window

        for (let i = 0; i < this.accessSequence.length - 1; i++) {
            const current = this.accessSequence[i];
            const next = this.accessSequence[i + 1];

            const timeDiff = next.timestamp.getTime() - current.timestamp.getTime();
            if (timeDiff > 0 && timeDiff < windowMs && current.module !== next.module) {
                if (!sequenceMap.has(current.module)) {
                    sequenceMap.set(current.module, new Map());
                }
                const followers = sequenceMap.get(current.module)!;
                followers.set(next.module, (followers.get(next.module) || 0) + 1);
            }
        }

        // Convert to array and sort by frequency
        const sequences: ModuleSequence[] = [];
        for (const [from, followers] of sequenceMap.entries()) {
            for (const [to, count] of followers.entries()) {
                if (count >= 3) { // Minimum 3 occurrences to be significant
                    sequences.push({
                        fromModule: from,
                        toModule: to,
                        occurrences: count,
                        confidence: Math.min(100, count * 10), // Simple confidence calculation
                    });
                }
            }
        }

        return sequences.sort((a, b) => b.occurrences - a.occurrences).slice(0, 20);
    }

    /**
     * Get recommendation for what to preload when a module is accessed
     */
    getPreloadRecommendation(accessedModule: string): string[] {
        const patterns = this.getPatterns();

        return patterns.sequences
            .filter(seq => seq.fromModule === accessedModule && seq.confidence >= 30)
            .map(seq => seq.toModule);
    }

    /**
     * Get all stats for export/persistence
     */
    getAllStats(): Map<string, ModuleUsageStats> {
        return new Map(this.moduleStats);
    }

    /**
     * Import stats (from persistence layer)
     */
    importStats(stats: Map<string, ModuleUsageStats>): void {
        this.moduleStats = new Map(stats);
        this.logger.log(`📊 Imported usage stats for ${stats.size} modules`);
    }

    /**
     * Clear all stats
     */
    clearStats(): void {
        this.moduleStats.clear();
        this.accessSequence = [];
    }

    private createEmptyStats(moduleName: string): ModuleUsageStats {
        return {
            moduleName,
            totalAccesses: 0,
            avgResponseTimeMs: 0,
            lastAccessedAt: new Date(),
            accessByHour: {},
            accessByOrg: {},
        };
    }

    private updateAverage(currentAvg: number, newValue: number, count: number): number {
        return Math.round(((currentAvg * (count - 1)) + newValue) / count);
    }
}

export interface ModuleUsageStats {
    moduleName: string;
    totalAccesses: number;
    avgResponseTimeMs: number;
    lastAccessedAt: Date;
    accessByHour: Record<number, number>; // hour (0-23) -> count
    accessByOrg: Record<string, number>;  // orgId -> count
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
    confidence: number; // 0-100
}
