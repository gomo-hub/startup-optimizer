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
var AutoDiscoveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoDiscoveryService = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const interfaces_1 = require("../../domain/interfaces");
const tier_manager_service_1 = require("./tier-manager.service");
const CORE_MODULES = [
    'ConfigModule',
    'ConfigHostModule',
    'TypeOrmCoreModule',
    'TypeOrmModule',
    'BullModule',
    'ScheduleModule',
    'CacheModule',
    'ThrottlerModule',
];
const ESSENTIAL_MODULES = [
    'AuthModule',
    'HealthModule',
    'IdentityModule',
    'DatabaseModule',
];
const HEAVY_MODULES = [
    'VideoComposerModule',
    'VslModule',
    'LiveAvatarModule',
    'CaptionsModule',
    'AiCloneModule',
    'AiAgentsModule',
    'AdsAutomationModule',
    'CompetitorIntelligenceModule',
    'FunnelOptimizerModule',
    'AiBrainModule',
    'ContentGenModule',
    'PdfEngineModule',
];
let AutoDiscoveryService = AutoDiscoveryService_1 = class AutoDiscoveryService {
    constructor(modulesContainer, tierManager) {
        this.modulesContainer = modulesContainer;
        this.tierManager = tierManager;
        this.logger = new common_1.Logger(AutoDiscoveryService_1.name);
    }
    async onModuleInit() {
        this.discoverAndRegisterModules();
    }
    discoverAndRegisterModules() {
        const modules = Array.from(this.modulesContainer.values());
        this.logger.log(`🔍 Auto-discovering ${modules.length} modules...`);
        for (const module of modules) {
            const name = this.getModuleName(module);
            if (this.isInternalModule(name))
                continue;
            if (this.tierManager.getModule(name))
                continue;
            const tier = this.determineTier(name);
            this.tierManager.register({
                module: module.metatype,
                tier,
                name,
                loaded: true,
                loadedAt: new Date(),
            });
        }
        const stats = this.tierManager.getStats();
        this.logger.log(`✅ Auto-discovered ${stats.total} modules`);
        this.logger.log(`📊 By tier: ${JSON.stringify(stats.byTier)}`);
    }
    determineTier(moduleName) {
        if (CORE_MODULES.some(m => moduleName.includes(m))) {
            return interfaces_1.ModuleTier.INSTANT;
        }
        if (ESSENTIAL_MODULES.some(m => moduleName.includes(m))) {
            return interfaces_1.ModuleTier.ESSENTIAL;
        }
        if (HEAVY_MODULES.some(m => moduleName.includes(m))) {
            return interfaces_1.ModuleTier.LAZY;
        }
        return interfaces_1.ModuleTier.BACKGROUND;
    }
    getModuleName(module) {
        return module.metatype?.name || 'UnknownModule';
    }
    isInternalModule(name) {
        const internalPatterns = [
            'InternalCoreModule',
            'StartupOptimizerModule',
            'Module',
        ];
        return internalPatterns.some(p => name === p) ||
            name.startsWith('Internal') ||
            name.startsWith('Passport');
    }
    getDiscoveredModules() {
        return this.tierManager.getStats().total > 0
            ? Array.from(this.tierManager.registry.keys())
            : [];
    }
};
exports.AutoDiscoveryService = AutoDiscoveryService;
exports.AutoDiscoveryService = AutoDiscoveryService = AutoDiscoveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.ModulesContainer,
        tier_manager_service_1.TierManagerService])
], AutoDiscoveryService);
//# sourceMappingURL=auto-discovery.service.js.map