import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ModuleOrchestratorService } from './module-orchestrator.service';
import { STARTUP_OPTIMIZER_OPTIONS } from '../../infrastructure/constants';
import { StartupOptimizerOptions } from '../../domain/interfaces';

/**
 * 🎯 Preload Strategy Service
 * 
 * Enables AI agents to preload modules based on predicted usage patterns.
 * Called by AI agents to proactively load modules before they are actually needed.
 * 
 * Example:
 * - AI detects pattern: "users who access Dashboard often access VideoComposer within 5 minutes"
 * - AI calls preloadPredicted(['VideoComposerModule']) after Dashboard is accessed
 * - VideoComposer is ready before user needs it
 */
@Injectable()
export class PreloadStrategyService {
    private readonly logger = new Logger(PreloadStrategyService.name);

    // Track preload history for learning
    private preloadHistory: Array<{
        moduleName: string;
        preloadedAt: Date;
        wasUsed: boolean;
        usedWithinMs?: number;
    }> = [];

    constructor(
        private readonly orchestrator: ModuleOrchestratorService,
        @Optional() @Inject(STARTUP_OPTIMIZER_OPTIONS)
        private readonly options?: StartupOptimizerOptions,
    ) { }

    /**
     * Preload multiple modules predicted to be needed soon
     * Called by AI agents based on usage pattern analysis
     */
    async preloadPredicted(moduleNames: string[]): Promise<PreloadResult[]> {
        const results: PreloadResult[] = [];

        for (const moduleName of moduleNames) {
            const result = await this.preloadModule(moduleName);
            results.push(result);
        }

        return results;
    }

    /**
     * Preload a single module
     */
    async preloadModule(moduleName: string): Promise<PreloadResult> {
        const startTime = Date.now();

        // Already loaded?
        if (this.orchestrator.isLoaded(moduleName)) {
            return {
                moduleName,
                success: true,
                alreadyLoaded: true,
                loadTimeMs: 0,
            };
        }

        // Try to load
        const loaded = await this.orchestrator.ensureLoaded(moduleName);
        const loadTimeMs = Date.now() - startTime;

        if (loaded) {
            this.logger.log(`🎯 Preloaded ${moduleName} in ${loadTimeMs}ms`);

            // Track for learning
            this.preloadHistory.push({
                moduleName,
                preloadedAt: new Date(),
                wasUsed: false, // Will be updated when module is actually accessed
            });
        } else {
            this.logger.warn(`⚠️ Failed to preload ${moduleName}`);
        }

        return {
            moduleName,
            success: loaded,
            alreadyLoaded: false,
            loadTimeMs,
        };
    }

    /**
     * Mark a preloaded module as "used"
     * Called when the module is actually accessed (for learning)
     */
    markAsUsed(moduleName: string): void {
        const entry = this.preloadHistory.find(
            h => h.moduleName === moduleName && !h.wasUsed
        );

        if (entry) {
            entry.wasUsed = true;
            entry.usedWithinMs = Date.now() - entry.preloadedAt.getTime();

            if (this.options?.debug) {
                this.logger.debug(
                    `📊 ${moduleName} was used ${entry.usedWithinMs}ms after preload`
                );
            }
        }
    }

    /**
     * Get preload effectiveness metrics (for AI learning)
     */
    getPreloadMetrics(): PreloadMetrics {
        const total = this.preloadHistory.length;
        const used = this.preloadHistory.filter(h => h.wasUsed).length;
        const unused = total - used;
        const avgTimeToUse = this.preloadHistory
            .filter(h => h.wasUsed && h.usedWithinMs)
            .reduce((sum, h) => sum + (h.usedWithinMs || 0), 0) / (used || 1);

        return {
            totalPreloads: total,
            usedPreloads: used,
            unusedPreloads: unused,
            hitRate: total > 0 ? Math.round((used / total) * 100) : 0,
            avgTimeToUseMs: Math.round(avgTimeToUse),
        };
    }

    /**
     * Clear preload history (for testing or reset)
     */
    clearHistory(): void {
        this.preloadHistory = [];
    }
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
    hitRate: number; // 0-100
    avgTimeToUseMs: number;
}
