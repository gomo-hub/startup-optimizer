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
var PreloadStrategyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreloadStrategyService = void 0;
const common_1 = require("@nestjs/common");
const module_orchestrator_service_1 = require("./module-orchestrator.service");
const constants_1 = require("../../infrastructure/constants");
let PreloadStrategyService = PreloadStrategyService_1 = class PreloadStrategyService {
    constructor(orchestrator, options) {
        this.orchestrator = orchestrator;
        this.options = options;
        this.logger = new common_1.Logger(PreloadStrategyService_1.name);
        this.preloadHistory = [];
    }
    async preloadPredicted(moduleNames) {
        const results = [];
        for (const moduleName of moduleNames) {
            const result = await this.preloadModule(moduleName);
            results.push(result);
        }
        return results;
    }
    async preloadModule(moduleName) {
        const startTime = Date.now();
        if (this.orchestrator.isLoaded(moduleName)) {
            return {
                moduleName,
                success: true,
                alreadyLoaded: true,
                loadTimeMs: 0,
            };
        }
        const loaded = await this.orchestrator.ensureLoaded(moduleName);
        const loadTimeMs = Date.now() - startTime;
        if (loaded) {
            this.logger.log(`🎯 Preloaded ${moduleName} in ${loadTimeMs}ms`);
            this.preloadHistory.push({
                moduleName,
                preloadedAt: new Date(),
                wasUsed: false,
            });
        }
        else {
            this.logger.warn(`⚠️ Failed to preload ${moduleName}`);
        }
        return {
            moduleName,
            success: loaded,
            alreadyLoaded: false,
            loadTimeMs,
        };
    }
    markAsUsed(moduleName) {
        const entry = this.preloadHistory.find(h => h.moduleName === moduleName && !h.wasUsed);
        if (entry) {
            entry.wasUsed = true;
            entry.usedWithinMs = Date.now() - entry.preloadedAt.getTime();
            if (this.options?.debug) {
                this.logger.debug(`📊 ${moduleName} was used ${entry.usedWithinMs}ms after preload`);
            }
        }
    }
    getPreloadMetrics() {
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
    clearHistory() {
        this.preloadHistory = [];
    }
};
exports.PreloadStrategyService = PreloadStrategyService;
exports.PreloadStrategyService = PreloadStrategyService = PreloadStrategyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, common_1.Inject)(constants_1.STARTUP_OPTIMIZER_OPTIONS)),
    __metadata("design:paramtypes", [module_orchestrator_service_1.ModuleOrchestratorService, Object])
], PreloadStrategyService);
//# sourceMappingURL=preload-strategy.service.js.map