import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ModuleOrchestratorService } from './module-orchestrator.service';
import { PreloadStrategyService } from './preload-strategy.service';
import { UsagePatternService, UsagePatterns } from './usage-pattern.service';
import { STARTUP_OPTIMIZER_OPTIONS } from '../../infrastructure/constants';
import { StartupOptimizerOptions } from '../../domain/interfaces';

/**
 * 🤖 Tier Management Service for AI Agents
 * 
 * Provides a structured interface for AI agents to:
 * 1. Analyze usage patterns
 * 2. Preload predicted modules
 * 3. Get tier recommendations
 * 4. Execute tier promotions
 * 
 * Can be integrated with @gomo-hub/ai-agents as a Tool
 */
@Injectable()
export class TierManagementService {
    private readonly logger = new Logger(TierManagementService.name);

    constructor(
        private readonly orchestrator: ModuleOrchestratorService,
        private readonly preloadStrategy: PreloadStrategyService,
        private readonly usagePatterns: UsagePatternService,
        @Optional() @Inject(STARTUP_OPTIMIZER_OPTIONS)
        private readonly options?: StartupOptimizerOptions,
    ) { }

    /**
     * Get current usage patterns for AI analysis
     * AI agent uses this to understand module access behavior
     */
    async analyzePatterns(): Promise<TierAnalysis> {
        const patterns = this.usagePatterns.getPatterns();
        const preloadMetrics = this.preloadStrategy.getPreloadMetrics();

        // Generate AI-friendly recommendations
        const recommendations = this.generateRecommendations(patterns);

        return {
            timestamp: new Date(),
            patterns,
            preloadMetrics,
            recommendations,
        };
    }

    /**
     * Preload modules based on AI prediction
     * Called when AI predicts modules will be needed soon
     */
    async preloadModules(moduleNames: string[]): Promise<PreloadResponse> {
        this.logger.log(`🤖 AI Agent requesting preload: ${moduleNames.join(', ')}`);

        const results = await this.preloadStrategy.preloadPredicted(moduleNames);

        const loaded = results.filter(r => r.success && !r.alreadyLoaded);
        const alreadyLoaded = results.filter(r => r.alreadyLoaded);
        const failed = results.filter(r => !r.success);

        return {
            success: failed.length === 0,
            loaded: loaded.map(r => r.moduleName),
            alreadyLoaded: alreadyLoaded.map(r => r.moduleName),
            failed: failed.map(r => r.moduleName),
            totalLoadTimeMs: loaded.reduce((sum, r) => sum + r.loadTimeMs, 0),
        };
    }

    /**
     * Promote a module from LAZY/DORMANT to be loaded immediately
     * True runtime promotion without restart
     */
    async promoteModule(moduleName: string): Promise<PromotionResult> {
        this.logger.log(`🤖 AI Agent promoting module: ${moduleName}`);

        const startTime = Date.now();
        const wasLoaded = this.orchestrator.isLoaded(moduleName);

        if (wasLoaded) {
            return {
                success: true,
                moduleName,
                wasAlreadyLoaded: true,
                loadTimeMs: 0,
                message: `${moduleName} was already loaded`,
            };
        }

        const loaded = await this.orchestrator.ensureLoaded(moduleName);
        const loadTimeMs = Date.now() - startTime;

        if (loaded) {
            this.logger.log(`✅ AI promoted ${moduleName} in ${loadTimeMs}ms`);
        } else {
            this.logger.warn(`❌ Failed to promote ${moduleName}`);
        }

        return {
            success: loaded,
            moduleName,
            wasAlreadyLoaded: false,
            loadTimeMs,
            message: loaded
                ? `${moduleName} promoted and loaded in ${loadTimeMs}ms`
                : `Failed to load ${moduleName}`,
        };
    }

    /**
     * Get module status for AI decision making
     */
    getModuleStatus(moduleName: string): ModuleStatus {
        const isLoaded = this.orchestrator.isLoaded(moduleName);
        const stats = this.usagePatterns.getAllStats().get(moduleName);

        return {
            moduleName,
            isLoaded,
            tier: this.inferTier(moduleName),
            stats: stats ? {
                totalAccesses: stats.totalAccesses,
                avgResponseTimeMs: stats.avgResponseTimeMs,
                lastAccessedAt: stats.lastAccessedAt,
            } : null,
        };
    }

    /**
     * Get all module statuses
     */
    getAllModuleStatuses(): ModuleStatus[] {
        const allStats = this.usagePatterns.getAllStats();
        const statuses: ModuleStatus[] = [];

        for (const [moduleName, stats] of allStats.entries()) {
            statuses.push(this.getModuleStatus(moduleName));
        }

        return statuses;
    }

    /**
     * AI-friendly prompt context for tier optimization
     */
    getOptimizationContext(): string {
        const analysis = this.usagePatterns.getPatterns();
        const metrics = this.preloadStrategy.getPreloadMetrics();

        return `
## Tier Optimization Context

### Current Time
Hour: ${analysis.currentHour}:00 (affects which modules are typically active)

### Top Accessed Modules
${analysis.topModules.slice(0, 5).map(m =>
            `- ${m.module}: ${m.totalAccesses} accesses, avg ${m.avgResponseTimeMs}ms`
        ).join('\n')}

### Hot at This Hour
${analysis.hotAtThisHour.slice(0, 5).map(m =>
            `- ${m.module}: ${m.accessesAtHour} accesses (${m.percentOfTotal}% of total)`
        ).join('\n')}

### Cold Modules (potential DORMANT candidates)
${analysis.coldModules.slice(0, 5).join(', ') || 'None'}

### Access Sequences (A→B patterns)
${analysis.sequences.slice(0, 5).map(s =>
            `- ${s.fromModule} → ${s.toModule}: ${s.occurrences} times (${s.confidence}% confidence)`
        ).join('\n') || 'No patterns detected yet'}

### Preload Effectiveness
- Total preloads: ${metrics.totalPreloads}
- Hit rate: ${metrics.hitRate}%
- Avg time to use: ${metrics.avgTimeToUseMs}ms

### Recommended Actions
${this.generateRecommendations(analysis).map(r => `- ${r}`).join('\n')}
`;
    }

    /**
     * Generate AI recommendations based on patterns
     */
    private generateRecommendations(patterns: UsagePatterns): string[] {
        const recommendations: string[] = [];

        // Recommend preloading based on sequences
        for (const seq of patterns.sequences.slice(0, 3)) {
            if (seq.confidence >= 50) {
                recommendations.push(
                    `Preload ${seq.toModule} when ${seq.fromModule} is accessed (${seq.confidence}% confidence)`
                );
            }
        }

        // Recommend demoting cold modules
        if (patterns.coldModules.length > 0) {
            recommendations.push(
                `Consider moving to DORMANT: ${patterns.coldModules.slice(0, 3).join(', ')}`
            );
        }

        // Hour-based recommendations
        for (const hot of patterns.hotAtThisHour.slice(0, 2)) {
            if (hot.percentOfTotal > 30) {
                recommendations.push(
                    `${hot.module} is hot at ${patterns.currentHour}:00 - ensure loaded`
                );
            }
        }

        if (recommendations.length === 0) {
            recommendations.push('Collect more usage data for better recommendations');
        }

        return recommendations;
    }

    /**
     * Infer current tier of a module (from config or runtime state)
     */
    private inferTier(moduleName: string): string {
        // For now, just check if loaded
        return this.orchestrator.isLoaded(moduleName) ? 'LOADED' : 'NOT_LOADED';
    }
}

// Response types
export interface TierAnalysis {
    timestamp: Date;
    patterns: UsagePatterns;
    preloadMetrics: {
        totalPreloads: number;
        usedPreloads: number;
        unusedPreloads: number;
        hitRate: number;
        avgTimeToUseMs: number;
    };
    recommendations: string[];
}

export interface PreloadResponse {
    success: boolean;
    loaded: string[];
    alreadyLoaded: string[];
    failed: string[];
    totalLoadTimeMs: number;
}

export interface PromotionResult {
    success: boolean;
    moduleName: string;
    wasAlreadyLoaded: boolean;
    loadTimeMs: number;
    message: string;
}

export interface ModuleStatus {
    moduleName: string;
    isLoaded: boolean;
    tier: string;
    stats: {
        totalAccesses: number;
        avgResponseTimeMs: number;
        lastAccessedAt: Date;
    } | null;
}
