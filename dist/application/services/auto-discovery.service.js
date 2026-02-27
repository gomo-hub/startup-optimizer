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
var AutoDiscoveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoDiscoveryService = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const interfaces_1 = require("../../domain/interfaces");
const entities_1 = require("../../domain/entities");
const tier_manager_service_1 = require("./tier-manager.service");
let AutoDiscoveryService = AutoDiscoveryService_1 = class AutoDiscoveryService {
    constructor(modulesContainer, tierManager, usageRepository) {
        this.modulesContainer = modulesContainer;
        this.tierManager = tierManager;
        this.usageRepository = usageRepository;
        this.logger = new common_1.Logger(AutoDiscoveryService_1.name);
        this.LEARNING_WINDOW_DAYS = 7;
        this.PROMOTION_THRESHOLD = 10;
        this.DEMOTION_THRESHOLD = 0;
    }
    async onModuleInit() {
        await this.discoverAndRegisterModules();
        await this.applyLearnedTiers();
    }
    async discoverAndRegisterModules() {
        const modules = Array.from(this.modulesContainer.values());
        this.logger.log(`🔍 Discovering ${modules.length} modules...`);
        for (const module of modules) {
            const name = this.getModuleName(module);
            if (this.isInternalModule(name))
                continue;
            if (this.tierManager.getModule(name))
                continue;
            const isAuthCritical = this.isAuthCriticalModule(module);
            const initialTier = isAuthCritical ? interfaces_1.ModuleTier.INSTANT : interfaces_1.ModuleTier.BACKGROUND;
            this.tierManager.register({
                module: module.metatype,
                tier: initialTier,
                name,
                loaded: true,
                loadedAt: new Date(),
            });
        }
        const stats = this.tierManager.getStats();
        this.logger.log(`✅ Discovered ${stats.total} modules (all start as BACKGROUND, will learn)`);
    }
    async applyLearnedTiers() {
        try {
            const windowStart = new Date();
            windowStart.setDate(windowStart.getDate() - this.LEARNING_WINDOW_DAYS);
            const usageStats = await this.usageRepository
                .createQueryBuilder('usage')
                .select('usage.moduleName', 'moduleName')
                .addSelect('COUNT(*)', 'accessCount')
                .addSelect('AVG(usage.loadTimeMs)', 'avgLoadTime')
                .where('usage.accessedAt > :windowStart', { windowStart })
                .groupBy('usage.moduleName')
                .orderBy('"accessCount"', 'DESC')
                .getRawMany();
            if (usageStats.length === 0) {
                this.logger.log('📊 No usage data yet - system will learn over time');
                return;
            }
            this.logger.log(`📊 Analyzing ${usageStats.length} modules with usage data...`);
            for (const stat of usageStats) {
                const { moduleName, accessCount, avgLoadTime } = stat;
                const count = parseInt(accessCount, 10);
                const registration = this.tierManager.getModule(moduleName);
                if (!registration)
                    continue;
                const optimalTier = this.calculateOptimalTier(count, avgLoadTime);
                if (registration.tier !== optimalTier) {
                    const oldTierName = interfaces_1.ModuleTier[registration.tier];
                    const newTierName = interfaces_1.ModuleTier[optimalTier];
                    registration.tier = optimalTier;
                    this.logger.log(`🎓 Learned: ${moduleName} moved ${oldTierName} → ${newTierName} ` +
                        `(${count} accesses, ${Math.round(avgLoadTime)}ms avg)`);
                }
            }
            await this.demoteUnusedModules(windowStart);
        }
        catch (error) {
            this.logger.debug(`First run or no usage data: ${error.message}`);
        }
    }
    calculateOptimalTier(accessCount, avgLoadTime) {
        if (accessCount >= 50) {
            return interfaces_1.ModuleTier.INSTANT;
        }
        if (accessCount >= 20) {
            return interfaces_1.ModuleTier.ESSENTIAL;
        }
        if (accessCount >= this.PROMOTION_THRESHOLD) {
            return interfaces_1.ModuleTier.BACKGROUND;
        }
        if (accessCount < 5 && avgLoadTime > 100) {
            return interfaces_1.ModuleTier.LAZY;
        }
        return interfaces_1.ModuleTier.BACKGROUND;
    }
    async demoteUnusedModules(windowStart) {
        const allModules = this.tierManager.getUnloadedModules();
        for (const registration of allModules) {
            const usageCount = await this.usageRepository.count({
                where: {
                    moduleName: registration.name,
                    accessedAt: (0, typeorm_2.MoreThan)(windowStart),
                },
            });
            if (usageCount === this.DEMOTION_THRESHOLD && registration.tier < interfaces_1.ModuleTier.LAZY) {
                const oldTier = interfaces_1.ModuleTier[registration.tier];
                registration.tier = interfaces_1.ModuleTier.LAZY;
                this.logger.log(`⬇️ Demoted unused: ${registration.name} (${oldTier} → LAZY)`);
            }
        }
    }
    isAuthCriticalModule(module) {
        const name = this.getModuleName(module);
        const authKeywords = ['auth', 'identity', 'passport', 'jwt', 'session', 'login'];
        const isAuthRelated = authKeywords.some(kw => name.toLowerCase().includes(kw));
        if (isAuthRelated)
            return true;
        try {
            const imports = module._imports || [];
            for (const imp of imports) {
                const impName = imp?.metatype?.name || '';
                if (authKeywords.some(kw => impName.toLowerCase().includes(kw))) {
                    return true;
                }
            }
        }
        catch {
        }
        return false;
    }
    async trackModuleAccess(moduleName, route, loadTimeMs, orgId) {
        try {
            const usage = this.usageRepository.create({
                moduleName,
                route,
                loadTimeMs,
                orgId: orgId || 'system',
                accessedAt: new Date(),
            });
            await this.usageRepository.save(usage);
        }
        catch (error) {
            this.logger.debug(`Failed to track usage: ${error.message}`);
        }
    }
    async relearn() {
        const beforeStats = this.tierManager.getStats();
        await this.applyLearnedTiers();
        const afterStats = this.tierManager.getStats();
        return {
            promoted: [],
            demoted: [],
        };
    }
    getModuleName(module) {
        return module.metatype?.name || 'UnknownModule';
    }
    isInternalModule(name) {
        return name === 'InternalCoreModule' ||
            name === 'StartupOptimizerModule' ||
            name === 'Module' ||
            name.startsWith('Internal') ||
            name.startsWith('Passport');
    }
};
exports.AutoDiscoveryService = AutoDiscoveryService;
exports.AutoDiscoveryService = AutoDiscoveryService = AutoDiscoveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.ModuleUsage)),
    __metadata("design:paramtypes", [core_1.ModulesContainer,
        tier_manager_service_1.TierManagerService,
        typeorm_2.Repository])
], AutoDiscoveryService);
//# sourceMappingURL=auto-discovery.service.js.map