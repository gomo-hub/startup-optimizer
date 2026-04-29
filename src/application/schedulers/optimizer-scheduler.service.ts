import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PersistenceService } from '../../infrastructure/persistence';
import { TierManagementService } from '../services/tier-management.service';
import { UsagePatternService } from '../services/usage-pattern.service';

/**
 * ⏰ Scheduled Tasks for Startup Optimizer
 * 
 * Runs periodic tasks using native timers (no @nestjs/schedule dependency):
 * - Module classification (HOT/WARM/COLD) - hourly
 * - Pattern aggregation - every 6 hours
 * - Decision validation - every 15 minutes
 * - Data cleanup - daily at 3am
 */
@Injectable()
export class OptimizerSchedulerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(OptimizerSchedulerService.name);

    // Read from env: MOD_AI_OPTIMIZE=false disables AI analysis in dev
    private isEnabled = process.env.MOD_AI_OPTIMIZE !== 'false';

    // Timer handles
    private hourlyTimer: NodeJS.Timeout | null = null;
    private sixHourTimer: NodeJS.Timeout | null = null;
    private fifteenMinTimer: NodeJS.Timeout | null = null;
    private dailyTimer: NodeJS.Timeout | null = null;

    constructor(
        private readonly persistence: PersistenceService,
        private readonly tierManagement: TierManagementService,
        private readonly usagePattern: UsagePatternService,
    ) { }

    async onModuleInit() {
        this.logger.log(`⏰ Optimizer Scheduler initialized (enabled: ${this.isEnabled})`);
        if (this.isEnabled) {
            this.startTimers();
        }
    }

    onModuleDestroy() {
        this.stopTimers();
    }

    /**
     * Enable/disable scheduled tasks
     */
    setEnabled(enabled: boolean) {
        this.isEnabled = enabled;
        this.logger.log(`⏰ Scheduler ${enabled ? 'enabled' : 'disabled'}`);

        if (enabled) {
            this.startTimers();
        } else {
            this.stopTimers();
        }
    }

    private startTimers() {
        // Every hour (3600000ms)
        this.hourlyTimer = setInterval(() => this.classifyModulesHourly(), 60 * 60 * 1000);

        // Every 6 hours (21600000ms)
        this.sixHourTimer = setInterval(() => this.analyzeAndPreload(), 6 * 60 * 60 * 1000);

        // Every 15 minutes (900000ms)
        this.fifteenMinTimer = setInterval(() => this.validateRecentDecisions(), 15 * 60 * 1000);

        // Daily check (every hour, execute at 3am)
        this.dailyTimer = setInterval(() => {
            const hour = new Date().getHours();
            if (hour === 3) {
                this.dailyCleanup();
            }
        }, 60 * 60 * 1000);

        this.logger.log('⏰ Timers started');
    }

    private stopTimers() {
        if (this.hourlyTimer) clearInterval(this.hourlyTimer);
        if (this.sixHourTimer) clearInterval(this.sixHourTimer);
        if (this.fifteenMinTimer) clearInterval(this.fifteenMinTimer);
        if (this.dailyTimer) clearInterval(this.dailyTimer);
        this.logger.log('⏰ Timers stopped');
    }

    // ═══════════════════════════════════════════════════════════════
    // HOURLY: Module Classification
    // ═══════════════════════════════════════════════════════════════

    async classifyModulesHourly() {
        if (!this.isEnabled) return;

        try {
            this.logger.log('📊 Running hourly module classification...');
            await this.persistence.classifyModules(7);
            this.logger.log('✅ Hourly classification completed');
        } catch (error) {
            this.logger.error('❌ Hourly classification failed:', error.message);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // EVERY 6 HOURS: Pattern Analysis & Preload Recommendations
    // ═══════════════════════════════════════════════════════════════

    async analyzeAndPreload() {
        if (!this.isEnabled) return;

        try {
            this.logger.log('🔍 Running pattern analysis...');

            // Analyze patterns
            const analysis = await this.tierManagement.analyzePatterns();

            // Get hot modules for current hour
            const currentHour = new Date().getHours();
            const hotModules = await this.persistence.getHotModulesAtHour(currentHour);

            // Preload hot modules that aren't loaded
            if (hotModules.length > 0) {
                const result = await this.tierManagement.preloadModules(hotModules);

                // Record AI decisions
                for (const moduleName of hotModules) {
                    await this.persistence.recordDecision({
                        moduleName,
                        toTier: 'PRELOADED',
                        decisionType: 'PRELOAD',
                        reason: `Auto-preload: HOT module at hour ${currentHour}`,
                        confidence: 75,
});
                }

                const successCount = result.loaded?.length || 0;
                this.logger.log(`🎯 Preloaded ${successCount} hot modules`);
            }

            // Log recommendations
            if (analysis.recommendations.length > 0) {
                this.logger.log(`💡 ${analysis.recommendations.length} recommendations generated`);
            }

        } catch (error) {
            this.logger.error('❌ Pattern analysis failed:', error.message);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // EVERY 15 MINUTES: Validate Recent Decisions
    // ═══════════════════════════════════════════════════════════════

    async validateRecentDecisions() {
        if (!this.isEnabled) return;

        try {
            // Get recent unvalidated decisions
            const recentDecisions = await this.persistence.getDecisionHistory({
                daysBack: 1,
                limit: 50,
});

            const unvalidated = recentDecisions.filter(d => d.wasEffective === null);

            for (const decision of unvalidated) {
                // Check if module was actually used after preload
                const stats = await this.persistence.getModuleStats(decision.moduleName);

                if (decision.decisionType === 'PRELOAD' || decision.decisionType === 'PROMOTE') {
                    // If accessed recently, consider effective
                    const wasEffective = stats.totalAccesses > 0;

                    await this.persistence.validateDecision(
                        decision.id,
                        wasEffective,
                        wasEffective ? stats.avgLoadTimeMs : undefined,
                    );
                }
            }

            if (unvalidated.length > 0) {
                this.logger.log(`✅ Validated ${unvalidated.length} decisions`);
            }

        } catch (error) {
            this.logger.error('❌ Decision validation failed:', error.message);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DAILY: Cleanup Old Data
    // ═══════════════════════════════════════════════════════════════

    async dailyCleanup() {
        if (!this.isEnabled) return;

        try {
            this.logger.log('🧹 Running daily cleanup...');
            await this.persistence.cleanup(30); // Keep 30 days
            this.logger.log('✅ Daily cleanup completed');
        } catch (error) {
            this.logger.error('❌ Daily cleanup failed:', error.message);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // MANUAL: Weekly Report (call manually or via admin endpoint)
    // ═══════════════════════════════════════════════════════════════

    async generateWeeklyReport(): Promise<{
        total: number;
        validated: number;
        effective: number;
        effectivenessRate: number;
        avgTimeToUseMs: number;
    }> {
        this.logger.log('📊 Generating weekly optimization report...');

        const effectiveness = await this.persistence.getDecisionEffectiveness();

        this.logger.log('═══════════════════════════════════════════');
        this.logger.log('📊 WEEKLY OPTIMIZATION REPORT');
        this.logger.log('═══════════════════════════════════════════');
        this.logger.log(`Total Decisions: ${effectiveness.total}`);
        this.logger.log(`Validated: ${effectiveness.validated}`);
        this.logger.log(`Effective: ${effectiveness.effective}`);
        this.logger.log(`Effectiveness Rate: ${effectiveness.effectivenessRate}%`);
        this.logger.log(`Avg Time to Use: ${effectiveness.avgTimeToUseMs}ms`);
        this.logger.log('═══════════════════════════════════════════');

        return effectiveness;
    }
}
