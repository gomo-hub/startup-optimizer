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
var TierManagementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TierManagementService = void 0;
const common_1 = require("@nestjs/common");
const module_orchestrator_service_1 = require("./module-orchestrator.service");
const preload_strategy_service_1 = require("./preload-strategy.service");
const usage_pattern_service_1 = require("./usage-pattern.service");
const tier_manager_service_1 = require("./tier-manager.service");
const constants_1 = require("../../infrastructure/constants");
const interfaces_1 = require("../../domain/interfaces");
let TierManagementService = TierManagementService_1 = class TierManagementService {
    constructor(orchestrator, preloadStrategy, usagePatterns, tierManager, options) {
        this.orchestrator = orchestrator;
        this.preloadStrategy = preloadStrategy;
        this.usagePatterns = usagePatterns;
        this.tierManager = tierManager;
        this.options = options;
        this.logger = new common_1.Logger(TierManagementService_1.name);
    }
    async analyzePatterns() {
        const patterns = this.usagePatterns.getPatterns();
        const preloadMetrics = this.preloadStrategy.getPreloadMetrics();
        const recommendations = this.generateRecommendations(patterns);
        return {
            timestamp: new Date(),
            patterns,
            preloadMetrics,
            recommendations,
        };
    }
    async preloadModules(moduleNames) {
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
    async promoteModule(moduleName) {
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
        }
        else {
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
    getModuleStatus(moduleName) {
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
    getAllModuleStatuses() {
        const statuses = [];
        const usageStats = this.usagePatterns.getAllStats();
        const tierStats = this.tierManager.getStats();
        if (tierStats.total > 0) {
            const allModules = this.tierManager.getUnloadedModules()
                .concat([...Array.from({ length: tierStats.loaded }, (_, i) => ({ name: `loaded-${i}` }))]);
            for (const [moduleName] of usageStats.entries()) {
                statuses.push(this.getModuleStatus(moduleName));
            }
            for (const tierName of ['INSTANT', 'ESSENTIAL', 'BACKGROUND', 'LAZY', 'DORMANT']) {
                const tier = interfaces_1.ModuleTier[tierName];
                if (typeof tier === 'number') {
                    const modulesInTier = this.tierManager.getModulesByTier(tier);
                    for (const mod of modulesInTier) {
                        if (!statuses.find(s => s.moduleName === mod.name)) {
                            statuses.push({
                                moduleName: mod.name,
                                isLoaded: mod.loaded || false,
                                tier: tierName,
                                stats: usageStats.get(mod.name) ? {
                                    totalAccesses: usageStats.get(mod.name).totalAccesses,
                                    avgResponseTimeMs: usageStats.get(mod.name).avgResponseTimeMs,
                                    lastAccessedAt: usageStats.get(mod.name).lastAccessedAt,
                                } : null,
                            });
                        }
                    }
                }
            }
        }
        else {
            for (const [moduleName] of usageStats.entries()) {
                statuses.push(this.getModuleStatus(moduleName));
            }
        }
        return statuses;
    }
    getOptimizationContext() {
        const analysis = this.usagePatterns.getPatterns();
        const metrics = this.preloadStrategy.getPreloadMetrics();
        return `
## Tier Optimization Context

### Current Time
Hour: ${analysis.currentHour}:00 (affects which modules are typically active)

### Top Accessed Modules
${analysis.topModules.slice(0, 5).map(m => `- ${m.module}: ${m.totalAccesses} accesses, avg ${m.avgResponseTimeMs}ms`).join('\n')}

### Hot at This Hour
${analysis.hotAtThisHour.slice(0, 5).map(m => `- ${m.module}: ${m.accessesAtHour} accesses (${m.percentOfTotal}% of total)`).join('\n')}

### Cold Modules (potential DORMANT candidates)
${analysis.coldModules.slice(0, 5).join(', ') || 'None'}

### Access Sequences (A→B patterns)
${analysis.sequences.slice(0, 5).map(s => `- ${s.fromModule} → ${s.toModule}: ${s.occurrences} times (${s.confidence}% confidence)`).join('\n') || 'No patterns detected yet'}

### Preload Effectiveness
- Total preloads: ${metrics.totalPreloads}
- Hit rate: ${metrics.hitRate}%
- Avg time to use: ${metrics.avgTimeToUseMs}ms

### Recommended Actions
${this.generateRecommendations(analysis).map(r => `- ${r}`).join('\n')}
`;
    }
    generateRecommendations(patterns) {
        const recommendations = [];
        for (const seq of patterns.sequences.slice(0, 3)) {
            if (seq.confidence >= 50) {
                recommendations.push(`Preload ${seq.toModule} when ${seq.fromModule} is accessed (${seq.confidence}% confidence)`);
            }
        }
        if (patterns.coldModules.length > 0) {
            recommendations.push(`Consider moving to DORMANT: ${patterns.coldModules.slice(0, 3).join(', ')}`);
        }
        for (const hot of patterns.hotAtThisHour.slice(0, 2)) {
            if (hot.percentOfTotal > 30) {
                recommendations.push(`${hot.module} is hot at ${patterns.currentHour}:00 - ensure loaded`);
            }
        }
        if (recommendations.length === 0) {
            recommendations.push('Collect more usage data for better recommendations');
        }
        return recommendations;
    }
    inferTier(moduleName) {
        const registration = this.tierManager.getModule(moduleName);
        if (registration) {
            return interfaces_1.ModuleTier[registration.tier] || 'BACKGROUND';
        }
        return this.orchestrator.isLoaded(moduleName) ? 'LOADED' : 'NOT_LOADED';
    }
};
exports.TierManagementService = TierManagementService;
exports.TierManagementService = TierManagementService = TierManagementService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, common_1.Optional)()),
    __param(4, (0, common_1.Inject)(constants_1.STARTUP_OPTIMIZER_OPTIONS)),
    __metadata("design:paramtypes", [module_orchestrator_service_1.ModuleOrchestratorService,
        preload_strategy_service_1.PreloadStrategyService,
        usage_pattern_service_1.UsagePatternService,
        tier_manager_service_1.TierManagerService, Object])
], TierManagementService);
//# sourceMappingURL=tier-management.service.js.map