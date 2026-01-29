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
var ModuleOrchestratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleOrchestratorService = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const interfaces_1 = require("../../domain/interfaces");
const tier_manager_service_1 = require("./tier-manager.service");
const resource_monitor_service_1 = require("./resource-monitor.service");
let ModuleOrchestratorService = ModuleOrchestratorService_1 = class ModuleOrchestratorService {
    constructor(lazyLoader, tierManager, resourceMonitor) {
        this.lazyLoader = lazyLoader;
        this.tierManager = tierManager;
        this.resourceMonitor = resourceMonitor;
        this.logger = new common_1.Logger(ModuleOrchestratorService_1.name);
        this.bootstrapComplete = false;
    }
    configure(options) {
        this.options = options;
        this.registerTiers();
    }
    async onApplicationBootstrap() {
        this.logger.log('🚀 StartupOptimizer: Application bootstrap complete');
        this.resourceMonitor.logStatus();
        await this.loadTier(interfaces_1.ModuleTier.ESSENTIAL);
        const delay = this.options?.backgroundDelay || 2000;
        setTimeout(() => this.loadBackgroundTier(), delay);
        this.bootstrapComplete = true;
    }
    async loadTier(tier) {
        const tierName = interfaces_1.ModuleTier[tier];
        this.logger.log(`📦 Loading tier: ${tierName}`);
        const modules = this.tierManager.getModulesByTier(tier);
        const startTime = Date.now();
        for (const registration of modules) {
            await this.loadModule(registration);
        }
        const elapsed = Date.now() - startTime;
        this.logger.log(`✅ Tier ${tierName} loaded in ${elapsed}ms (${modules.length} modules)`);
    }
    async loadModule(registration) {
        const { name, module } = registration;
        if (this.tierManager.isLoaded(name)) {
            return true;
        }
        if (!this.tierManager.areDependenciesLoaded(name)) {
            this.logger.warn(`⏳ Deferring ${name}: dependencies not ready`);
            return false;
        }
        if (registration.tier >= interfaces_1.ModuleTier.BACKGROUND) {
            if (!this.resourceMonitor.canLoadModuleDynamic()) {
                this.logger.warn(`⏳ Deferring ${name}: system memory constrained`);
                return false;
            }
        }
        try {
            const startTime = Date.now();
            await this.lazyLoader.load(() => module);
            const elapsed = Date.now() - startTime;
            this.tierManager.markLoaded(name);
            if (this.options?.debug) {
                this.logger.debug(`📦 ${name} lazy-loaded in ${elapsed}ms`);
            }
            return true;
        }
        catch (error) {
            if (error?.message?.includes('Cannot read properties of null') ||
                error?.message?.includes('already exists') ||
                error?.message?.includes('undefined')) {
                this.tierManager.markLoaded(name);
                if (this.options?.debug) {
                    this.logger.debug(`📦 ${name} already loaded (sync import)`);
                }
                return true;
            }
            this.logger.error(`❌ Failed to load ${name}: ${error.message}`);
            return false;
        }
    }
    async ensureLoaded(moduleName) {
        if (this.tierManager.isLoaded(moduleName)) {
            return true;
        }
        const registration = this.tierManager.getModule(moduleName);
        if (!registration) {
            this.logger.warn(`❓ Unknown module: ${moduleName}`);
            return false;
        }
        return this.loadModule(registration);
    }
    async ensureLoadedForRoute(route) {
        const registration = this.tierManager.getModuleByRoute(route);
        if (!registration) {
            return true;
        }
        return this.ensureLoaded(registration.name);
    }
    async loadBackgroundTier() {
        this.logger.log('🔄 Loading BACKGROUND tier...');
        await this.loadTier(interfaces_1.ModuleTier.BACKGROUND);
        this.resourceMonitor.logStatus();
    }
    registerTiers() {
        const tiers = this.options?.tiers;
        if (!tiers)
            return;
        const tierMappings = [
            ['instant', interfaces_1.ModuleTier.INSTANT],
            ['essential', interfaces_1.ModuleTier.ESSENTIAL],
            ['background', interfaces_1.ModuleTier.BACKGROUND],
            ['lazy', interfaces_1.ModuleTier.LAZY],
            ['dormant', interfaces_1.ModuleTier.DORMANT],
        ];
        for (const [key, tier] of tierMappings) {
            const modules = tiers[key];
            if (!modules?.length)
                continue;
            for (const module of modules) {
                const name = module.name || module.constructor?.name || 'Unknown';
                this.tierManager.register({
                    module,
                    tier,
                    name,
                });
            }
        }
        const stats = this.tierManager.getStats();
        this.logger.log(`📊 Registered ${stats.total} modules: ${JSON.stringify(stats.byTier)}`);
    }
    getStats() {
        return {
            modules: this.tierManager.getStats(),
            resources: this.resourceMonitor.getCurrentUsage(),
            bootstrapComplete: this.bootstrapComplete,
        };
    }
};
exports.ModuleOrchestratorService = ModuleOrchestratorService;
exports.ModuleOrchestratorService = ModuleOrchestratorService = ModuleOrchestratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.LazyModuleLoader,
        tier_manager_service_1.TierManagerService,
        resource_monitor_service_1.ResourceMonitorService])
], ModuleOrchestratorService);
//# sourceMappingURL=module-orchestrator.service.js.map