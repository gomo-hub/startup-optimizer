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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartupOptimizerAdminController = void 0;
const common_1 = require("@nestjs/common");
const tier_manager_service_1 = require("../services/tier-manager.service");
const module_orchestrator_service_1 = require("../services/module-orchestrator.service");
const resource_monitor_service_1 = require("../services/resource-monitor.service");
const tier_management_service_1 = require("../services/tier-management.service");
const usage_pattern_service_1 = require("../services/usage-pattern.service");
const persistence_1 = require("../../infrastructure/persistence");
let StartupOptimizerAdminController = class StartupOptimizerAdminController {
    constructor(tierManager, orchestrator, resourceMonitor, tierManagement, usagePattern, persistence) {
        this.tierManager = tierManager;
        this.orchestrator = orchestrator;
        this.resourceMonitor = resourceMonitor;
        this.tierManagement = tierManagement;
        this.usagePattern = usagePattern;
        this.persistence = persistence;
    }
    async getDashboard() {
        const [systemHealth, moduleStats, tierDistribution, aiDecisions, usagePatterns,] = await Promise.all([
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
    async getModuleDetail(moduleName) {
        const status = this.tierManagement.getModuleStatus(moduleName);
        const dbStats = await this.persistence.getModuleStats(moduleName);
        const patterns = await this.persistence.getPatterns(moduleName);
        return {
            ...status,
            usage: dbStats,
            patterns,
        };
    }
    async getTierDistribution() {
        const statuses = this.tierManagement.getAllModuleStatuses();
        const distribution = {
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
    async getAIDecisions(days = 7, limit = 50) {
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
    async getAIContext() {
        return {
            context: this.tierManagement.getOptimizationContext(),
        };
    }
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
    async preloadModules(body) {
        const result = await this.tierManagement.preloadModules(body.moduleNames);
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
    async promoteModule(body) {
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
    async classifyModules(body) {
        await this.persistence.classifyModules(body.periodDays || 7);
        return { success: true, message: 'Classification completed' };
    }
    async cleanup(body) {
        await this.persistence.cleanup(body.retentionDays || 30);
        return { success: true, message: 'Cleanup completed' };
    }
    async seedDecisions() {
        if (!this.persistence) {
            return { success: false, message: 'Persistence service not available' };
        }
        const sampleDecisions = [
            { moduleName: 'PaymentsModule', fromTier: 'LAZY', toTier: 'ESSENTIAL', type: 'PROMOTE', confidence: 92 },
            { moduleName: 'CartModule', fromTier: 'BACKGROUND', toTier: 'ESSENTIAL', type: 'PROMOTE', confidence: 88 },
            { moduleName: 'AiEngineModule', fromTier: 'LAZY', toTier: 'BACKGROUND', type: 'PRELOAD', confidence: 85 },
            { moduleName: 'VslModule', fromTier: 'BACKGROUND', toTier: 'LAZY', type: 'DEMOTE', confidence: 78 },
            { moduleName: 'LiveAvatarModule', fromTier: 'BACKGROUND', toTier: 'DORMANT', type: 'OPTIMIZE', confidence: 72 },
            { moduleName: 'EmailSequencesModule', fromTier: 'LAZY', toTier: 'BACKGROUND', type: 'PROMOTE', confidence: 81 },
            { moduleName: 'AnalyticsModule', fromTier: 'ESSENTIAL', toTier: 'INSTANT', type: 'PROMOTE', confidence: 95 },
            { moduleName: 'CompetitorIntelligenceModule', fromTier: 'BACKGROUND', toTier: 'DORMANT', type: 'DEMOTE', confidence: 65 },
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
            }
            catch (err) {
            }
        }
        return {
            success: true,
            message: `Created ${created.length} sample AI decisions`,
            decisions: created,
        };
    }
};
exports.StartupOptimizerAdminController = StartupOptimizerAdminController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StartupOptimizerAdminController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StartupOptimizerAdminController.prototype, "getSystemHealth", null);
__decorate([
    (0, common_1.Get)('modules'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StartupOptimizerAdminController.prototype, "getModuleStats", null);
__decorate([
    (0, common_1.Get)('modules/:moduleName'),
    __param(0, (0, common_1.Param)('moduleName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StartupOptimizerAdminController.prototype, "getModuleDetail", null);
__decorate([
    (0, common_1.Get)('tiers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StartupOptimizerAdminController.prototype, "getTierDistribution", null);
__decorate([
    (0, common_1.Get)('ai/decisions'),
    __param(0, (0, common_1.Query)('days')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StartupOptimizerAdminController.prototype, "getAIDecisions", null);
__decorate([
    (0, common_1.Get)('ai/context'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StartupOptimizerAdminController.prototype, "getAIContext", null);
__decorate([
    (0, common_1.Get)('patterns'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StartupOptimizerAdminController.prototype, "getUsagePatterns", null);
__decorate([
    (0, common_1.Post)('actions/preload'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StartupOptimizerAdminController.prototype, "preloadModules", null);
__decorate([
    (0, common_1.Post)('actions/promote'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StartupOptimizerAdminController.prototype, "promoteModule", null);
__decorate([
    (0, common_1.Post)('actions/classify'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StartupOptimizerAdminController.prototype, "classifyModules", null);
__decorate([
    (0, common_1.Post)('actions/cleanup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StartupOptimizerAdminController.prototype, "cleanup", null);
__decorate([
    (0, common_1.Post)('actions/seed-decisions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StartupOptimizerAdminController.prototype, "seedDecisions", null);
exports.StartupOptimizerAdminController = StartupOptimizerAdminController = __decorate([
    (0, common_1.Controller)('admin/startup-optimizer'),
    __metadata("design:paramtypes", [tier_manager_service_1.TierManagerService,
        module_orchestrator_service_1.ModuleOrchestratorService,
        resource_monitor_service_1.ResourceMonitorService,
        tier_management_service_1.TierManagementService,
        usage_pattern_service_1.UsagePatternService,
        persistence_1.PersistenceService])
], StartupOptimizerAdminController);
//# sourceMappingURL=startup-optimizer-admin.controller.js.map