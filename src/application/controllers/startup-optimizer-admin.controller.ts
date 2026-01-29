import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { TierManagerService } from '../services/tier-manager.service';
import { ModuleOrchestratorService } from '../services/module-orchestrator.service';
import { ResourceMonitorService } from '../services/resource-monitor.service';
import { TierManagementService } from '../services/tier-management.service';
import { UsagePatternService } from '../services/usage-pattern.service';
import { PersistenceService } from '../../infrastructure/persistence';

/**
 * 📊 Admin Dashboard Controller
 * 
 * Provides admin-only endpoints for monitoring and managing
 * the startup optimizer and module loading system.
 * 
 * NOTE: Add your AdminGuard here to protect these endpoints
 */
@Controller('admin/startup-optimizer')
// @UseGuards(AdminGuard) // Uncomment and use your admin guard
export class StartupOptimizerAdminController {
    constructor(
        private readonly tierManager: TierManagerService,
        private readonly orchestrator: ModuleOrchestratorService,
        private readonly resourceMonitor: ResourceMonitorService,
        private readonly tierManagement: TierManagementService,
        private readonly usagePattern: UsagePatternService,
        private readonly persistence: PersistenceService,
    ) { }

    // ═══════════════════════════════════════════════════════════════
    // DASHBOARD OVERVIEW
    // ═══════════════════════════════════════════════════════════════

    @Get('dashboard')
    async getDashboard() {
        const [
            systemHealth,
            moduleStats,
            tierDistribution,
            aiDecisions,
            usagePatterns,
        ] = await Promise.all([
            this.getSystemHealth(),
            this.getModuleStats(),
            this.getTierDistribution(),
            this.getAIDecisions(),
            this.getUsagePatterns(),
        ]);

        return {
            timestamp: new Date().toISOString(),
            systemHealth,
            moduleStats,
            tierDistribution,
            aiDecisions,
            usagePatterns,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // SYSTEM HEALTH
    // ═══════════════════════════════════════════════════════════════

    @Get('health')
    async getSystemHealth() {
        const resources = this.resourceMonitor.getCurrentUsage();
        const memory = this.resourceMonitor.getSystemMemory();

        return {
            status: 'healthy',
            resources: {
                heapUsedMB: resources.heapUsedMB,
                heapTotalMB: resources.heapTotalMB,
                memoryUsagePercent: resources.memoryUsagePercent,
            },
            memory: {
                totalMB: memory.totalMB,
                freeMB: memory.freeMB,
                usagePercent: memory.usagePercent,
            },
            thresholds: {
                dynamic: this.resourceMonitor.calculateDynamicThreshold(),
                memoryTrend: this.resourceMonitor.getMemoryTrend(),
            },
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // MODULE STATS
    // ═══════════════════════════════════════════════════════════════

    @Get('modules')
    async getModuleStats() {
        const statuses = this.tierManagement.getAllModuleStatuses();
        const loaded = statuses.filter(m => m.isLoaded).length;
        const pending = statuses.filter(m => !m.isLoaded).length;

        return {
            total: statuses.length,
            loaded,
            pending,
            loadedPercent: statuses.length > 0
                ? Math.round((loaded / statuses.length) * 100)
                : 0,
            modules: statuses,
        };
    }

    @Get('modules/:moduleName')
    async getModuleDetail(@Param('moduleName') moduleName: string) {
        const status = this.tierManagement.getModuleStatus(moduleName);
        const dbStats = await this.persistence.getModuleStats(moduleName);
        const patterns = await this.persistence.getPatterns(moduleName);

        return {
            ...status,
            usage: dbStats,
            patterns,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // TIER DISTRIBUTION
    // ═══════════════════════════════════════════════════════════════

    @Get('tiers')
    async getTierDistribution() {
        const statuses = this.tierManagement.getAllModuleStatuses();

        const distribution: Record<string, { count: number; loaded: number; modules: string[] }> = {
            INSTANT: { count: 0, loaded: 0, modules: [] },
            ESSENTIAL: { count: 0, loaded: 0, modules: [] },
            BACKGROUND: { count: 0, loaded: 0, modules: [] },
            LAZY: { count: 0, loaded: 0, modules: [] },
            DORMANT: { count: 0, loaded: 0, modules: [] },
        };

        for (const module of statuses) {
            const tier = module.tier || 'LAZY';
            if (!distribution[tier]) {
                distribution[tier] = { count: 0, loaded: 0, modules: [] };
            }
            distribution[tier].count++;
            distribution[tier].modules.push(module.moduleName);
            if (module.isLoaded) {
                distribution[tier].loaded++;
            }
        }

        return {
            distribution,
            summary: {
                instantLoaded: distribution.INSTANT.loaded,
                essentialLoaded: distribution.ESSENTIAL.loaded,
                backgroundLoaded: distribution.BACKGROUND.loaded,
                lazyLoaded: distribution.LAZY.loaded,
                dormantLoaded: distribution.DORMANT.loaded,
            },
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // AI DECISIONS
    // ═══════════════════════════════════════════════════════════════

    @Get('ai/decisions')
    async getAIDecisions(
        @Query('days') days = 7,
        @Query('limit') limit = 50,
    ) {
        const [decisions, effectiveness] = await Promise.all([
            this.persistence.getDecisionHistory({ daysBack: days, limit }),
            this.persistence.getDecisionEffectiveness(),
        ]);

        return {
            effectiveness,
            recentDecisions: decisions.map(d => ({
                id: d.id,
                moduleName: d.moduleName,
                type: d.decisionType,
                fromTier: d.fromTier,
                toTier: d.toTier,
                confidence: d.confidence,
                wasEffective: d.wasEffective,
                decidedAt: d.decidedAt,
            })),
        };
    }

    @Get('ai/context')
    async getAIContext() {
        return {
            context: this.tierManagement.getOptimizationContext(),
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // USAGE PATTERNS
    // ═══════════════════════════════════════════════════════════════

    @Get('patterns')
    async getUsagePatterns() {
        const currentHour = new Date().getHours();

        const [sequences, hotModules, analysis] = await Promise.all([
            this.persistence.getSequencePatterns(30),
            this.persistence.getHotModulesAtHour(currentHour),
            this.tierManagement.analyzePatterns(),
        ]);

        return {
            currentHour,
            hotModulesNow: hotModules,
            topSequences: sequences.slice(0, 10),
            analysis,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTIONS
    // ═══════════════════════════════════════════════════════════════

    @Post('actions/preload')
    async preloadModules(@Body() body: { moduleNames: string[] }) {
        const result = await this.tierManagement.preloadModules(body.moduleNames);

        // Record decision
        for (const moduleName of body.moduleNames) {
            await this.persistence.recordDecision({
                moduleName,
                toTier: 'PRELOADED',
                decisionType: 'PRELOAD',
                reason: 'Manual admin preload',
                confidence: 100,
            });
        }

        return result;
    }

    @Post('actions/promote')
    async promoteModule(@Body() body: { moduleName: string; reason?: string }) {
        const result = await this.tierManagement.promoteModule(body.moduleName);

        if (result.success) {
            await this.persistence.recordDecision({
                moduleName: body.moduleName,
                toTier: 'PROMOTED',
                decisionType: 'PROMOTE',
                reason: body.reason || 'Manual admin promotion',
                confidence: 100,
            });
        }

        return result;
    }

    @Post('actions/classify')
    async classifyModules(@Body() body: { periodDays?: number }) {
        await this.persistence.classifyModules(body.periodDays || 7);
        return { success: true, message: 'Classification completed' };
    }

    @Post('actions/cleanup')
    async cleanup(@Body() body: { retentionDays?: number }) {
        await this.persistence.cleanup(body.retentionDays || 30);
        return { success: true, message: 'Cleanup completed' };
    }

    /**
     * 🌱 Seed sample AI decisions for demonstration
     */
    @Post('actions/seed-decisions')
    async seedDecisions() {
        if (!this.persistence) {
            return { success: false, message: 'Persistence service not available' };
        }

        const sampleDecisions = [
            { moduleName: 'PaymentsModule', fromTier: 'LAZY', toTier: 'ESSENTIAL', type: 'PROMOTE' as const, confidence: 92 },
            { moduleName: 'CartModule', fromTier: 'BACKGROUND', toTier: 'ESSENTIAL', type: 'PROMOTE' as const, confidence: 88 },
            { moduleName: 'AiEngineModule', fromTier: 'LAZY', toTier: 'BACKGROUND', type: 'PRELOAD' as const, confidence: 85 },
            { moduleName: 'VslModule', fromTier: 'BACKGROUND', toTier: 'LAZY', type: 'DEMOTE' as const, confidence: 78 },
            { moduleName: 'LiveAvatarModule', fromTier: 'BACKGROUND', toTier: 'DORMANT', type: 'OPTIMIZE' as const, confidence: 72 },
            { moduleName: 'EmailSequencesModule', fromTier: 'LAZY', toTier: 'BACKGROUND', type: 'PROMOTE' as const, confidence: 81 },
            { moduleName: 'AnalyticsModule', fromTier: 'ESSENTIAL', toTier: 'INSTANT', type: 'PROMOTE' as const, confidence: 95 },
            { moduleName: 'CompetitorIntelligenceModule', fromTier: 'BACKGROUND', toTier: 'DORMANT', type: 'DEMOTE' as const, confidence: 65 },
        ];

        const created = [];
        for (const decision of sampleDecisions) {
            try {
                const saved = await this.persistence.recordDecision({
                    moduleName: decision.moduleName,
                    fromTier: decision.fromTier,
                    toTier: decision.toTier,
                    decisionType: decision.type,
                    agentId: 'TierOptimizerTool',
                    reason: `AI recommendation based on usage patterns analysis`,
                    confidence: decision.confidence,
                });
                created.push({ id: saved.id, module: decision.moduleName, type: decision.type });
            } catch (err) {
                // Skip if already exists or error
            }
        }

        return {
            success: true,
            message: `Created ${created.length} sample AI decisions`,
            decisions: created,
        };
    }
}
