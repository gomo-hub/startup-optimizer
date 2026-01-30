"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OptimizerSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizerSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const persistence_1 = require("../../infrastructure/persistence");
const tier_management_service_1 = require("../services/tier-management.service");
const usage_pattern_service_1 = require("../services/usage-pattern.service");
let OptimizerSchedulerService = OptimizerSchedulerService_1 = class OptimizerSchedulerService {
    constructor(persistence, tierManagement, usagePattern) {
        this.persistence = persistence;
        this.tierManagement = tierManagement;
        this.usagePattern = usagePattern;
        this.logger = new common_1.Logger(OptimizerSchedulerService_1.name);
        this.isEnabled = process.env.MOD_AI_OPTIMIZE !== 'false';
        this.hourlyTimer = null;
        this.sixHourTimer = null;
        this.fifteenMinTimer = null;
        this.dailyTimer = null;
    }
    async onModuleInit() {
        this.logger.log(`⏰ Optimizer Scheduler initialized (enabled: ${this.isEnabled})`);
        if (this.isEnabled) {
            this.startTimers();
        }
    }
    onModuleDestroy() {
        this.stopTimers();
    }
    setEnabled(enabled) {
        this.isEnabled = enabled;
        this.logger.log(`⏰ Scheduler ${enabled ? 'enabled' : 'disabled'}`);
        if (enabled) {
            this.startTimers();
        }
        else {
            this.stopTimers();
        }
    }
    startTimers() {
        this.hourlyTimer = setInterval(() => this.classifyModulesHourly(), 60 * 60 * 1000);
        this.sixHourTimer = setInterval(() => this.analyzeAndPreload(), 6 * 60 * 60 * 1000);
        this.fifteenMinTimer = setInterval(() => this.validateRecentDecisions(), 15 * 60 * 1000);
        this.dailyTimer = setInterval(() => {
            const hour = new Date().getHours();
            if (hour === 3) {
                this.dailyCleanup();
            }
        }, 60 * 60 * 1000);
        this.logger.log('⏰ Timers started');
    }
    stopTimers() {
        if (this.hourlyTimer)
            clearInterval(this.hourlyTimer);
        if (this.sixHourTimer)
            clearInterval(this.sixHourTimer);
        if (this.fifteenMinTimer)
            clearInterval(this.fifteenMinTimer);
        if (this.dailyTimer)
            clearInterval(this.dailyTimer);
        this.logger.log('⏰ Timers stopped');
    }
    async classifyModulesHourly() {
        if (!this.isEnabled)
            return;
        try {
            this.logger.log('📊 Running hourly module classification...');
            await this.persistence.classifyModules(7);
            this.logger.log('✅ Hourly classification completed');
        }
        catch (error) {
            this.logger.error('❌ Hourly classification failed:', error.message);
        }
    }
    async analyzeAndPreload() {
        if (!this.isEnabled)
            return;
        try {
            this.logger.log('🔍 Running pattern analysis...');
            const analysis = await this.tierManagement.analyzePatterns();
            const currentHour = new Date().getHours();
            const hotModules = await this.persistence.getHotModulesAtHour(currentHour);
            if (hotModules.length > 0) {
                const result = await this.tierManagement.preloadModules(hotModules);
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
            if (analysis.recommendations.length > 0) {
                this.logger.log(`💡 ${analysis.recommendations.length} recommendations generated`);
            }
        }
        catch (error) {
            this.logger.error('❌ Pattern analysis failed:', error.message);
        }
    }
    async validateRecentDecisions() {
        if (!this.isEnabled)
            return;
        try {
            const recentDecisions = await this.persistence.getDecisionHistory({
                daysBack: 1,
                limit: 50,
            });
            const unvalidated = recentDecisions.filter(d => d.wasEffective === null);
            for (const decision of unvalidated) {
                const stats = await this.persistence.getModuleStats(decision.moduleName);
                if (decision.decisionType === 'PRELOAD' || decision.decisionType === 'PROMOTE') {
                    const wasEffective = stats.totalAccesses > 0;
                    await this.persistence.validateDecision(decision.id, wasEffective, wasEffective ? stats.avgLoadTimeMs : undefined);
                }
            }
            if (unvalidated.length > 0) {
                this.logger.log(`✅ Validated ${unvalidated.length} decisions`);
            }
        }
        catch (error) {
            this.logger.error('❌ Decision validation failed:', error.message);
        }
    }
    async dailyCleanup() {
        if (!this.isEnabled)
            return;
        try {
            this.logger.log('🧹 Running daily cleanup...');
            await this.persistence.cleanup(30);
            this.logger.log('✅ Daily cleanup completed');
        }
        catch (error) {
            this.logger.error('❌ Daily cleanup failed:', error.message);
        }
    }
    async generateWeeklyReport() {
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
};
exports.OptimizerSchedulerService = OptimizerSchedulerService;
exports.OptimizerSchedulerService = OptimizerSchedulerService = OptimizerSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [persistence_1.PersistenceService,
        tier_management_service_1.TierManagementService,
        usage_pattern_service_1.UsagePatternService])
], OptimizerSchedulerService);
//# sourceMappingURL=optimizer-scheduler.service.js.map