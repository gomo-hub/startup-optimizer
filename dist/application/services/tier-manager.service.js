"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TierManagerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TierManagerService = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../../domain/interfaces");
let TierManagerService = TierManagerService_1 = class TierManagerService {
    constructor() {
        this.logger = new common_1.Logger(TierManagerService_1.name);
        this.registry = new Map();
    }
    register(registration) {
        this.registry.set(registration.name, {
            ...registration,
            loaded: false,
        });
        this.logger.debug(`📦 Registered module: ${registration.name} (Tier ${interfaces_1.ModuleTier[registration.tier]})`);
    }
    registerBulk(registrations) {
        registrations.forEach(reg => this.register(reg));
    }
    getModulesByTier(tier) {
        return Array.from(this.registry.values())
            .filter(reg => reg.tier === tier)
            .sort((a, b) => {
            const aDeps = a.dependencies?.length || 0;
            const bDeps = b.dependencies?.length || 0;
            return aDeps - bDeps;
        });
    }
    getModule(name) {
        return this.registry.get(name);
    }
    getModuleByRoute(route) {
        for (const [_, registration] of this.registry) {
            if (registration.routes?.some(r => route.startsWith(r))) {
                return registration;
            }
        }
        return undefined;
    }
    markLoaded(name) {
        const reg = this.registry.get(name);
        if (reg) {
            reg.loaded = true;
            reg.loadedAt = new Date();
            this.logger.log(`✅ Module loaded: ${name}`);
        }
    }
    isLoaded(name) {
        return this.registry.get(name)?.loaded || false;
    }
    areDependenciesLoaded(name) {
        const reg = this.registry.get(name);
        if (!reg?.dependencies?.length)
            return true;
        return reg.dependencies.every(dep => this.isLoaded(dep));
    }
    getUnloadedModules() {
        return Array.from(this.registry.values()).filter(reg => !reg.loaded);
    }
    getStats() {
        const all = Array.from(this.registry.values());
        const byTier = {};
        for (const tier of Object.values(interfaces_1.ModuleTier).filter(v => typeof v === 'number')) {
            byTier[interfaces_1.ModuleTier[tier]] = all.filter(r => r.tier === tier).length;
        }
        return {
            total: all.length,
            loaded: all.filter(r => r.loaded).length,
            byTier,
        };
    }
    promoteTier(name) {
        const reg = this.registry.get(name);
        if (reg && reg.tier > interfaces_1.ModuleTier.INSTANT) {
            const oldTier = interfaces_1.ModuleTier[reg.tier];
            reg.tier = reg.tier - 1;
            const newTier = interfaces_1.ModuleTier[reg.tier];
            this.logger.log(`⬆️ Promoted ${name}: ${oldTier} → ${newTier}`);
        }
    }
    demoteTier(name) {
        const reg = this.registry.get(name);
        if (reg && reg.tier < interfaces_1.ModuleTier.DORMANT) {
            const oldTier = interfaces_1.ModuleTier[reg.tier];
            reg.tier = reg.tier + 1;
            const newTier = interfaces_1.ModuleTier[reg.tier];
            this.logger.log(`⬇️ Demoted ${name}: ${oldTier} → ${newTier}`);
        }
    }
};
exports.TierManagerService = TierManagerService;
exports.TierManagerService = TierManagerService = TierManagerService_1 = __decorate([
    (0, common_1.Injectable)()
], TierManagerService);
//# sourceMappingURL=tier-manager.service.js.map