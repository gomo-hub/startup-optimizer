import { Injectable, Logger } from '@nestjs/common';
import { ModuleTier, ModuleRegistration } from '../../domain/interfaces';

/**
 * Manages module tiers and their metadata
 */
@Injectable()
export class TierManagerService {
    private readonly logger = new Logger(TierManagerService.name);
    private readonly registry = new Map<string, ModuleRegistration>();

    /**
     * Register a module with its tier
     */
    register(registration: ModuleRegistration): void {
        this.registry.set(registration.name, {
            ...registration,
            loaded: false,
        });
        this.logger.debug(`📦 Registered module: ${registration.name} (Tier ${ModuleTier[registration.tier]})`);
    }

    /**
     * Register multiple modules at once
     */
    registerBulk(registrations: ModuleRegistration[]): void {
        registrations.forEach(reg => this.register(reg));
    }

    /**
     * Get all modules for a specific tier
     */
    getModulesByTier(tier: ModuleTier): ModuleRegistration[] {
        return Array.from(this.registry.values())
            .filter(reg => reg.tier === tier)
            .sort((a, b) => {
                // Sort by dependencies (modules with no deps first)
                const aDeps = a.dependencies?.length || 0;
                const bDeps = b.dependencies?.length || 0;
                return aDeps - bDeps;
            });
    }

    /**
     * Get module by name
     */
    getModule(name: string): ModuleRegistration | undefined {
        return this.registry.get(name);
    }

    /**
     * Get module by route pattern
     */
    getModuleByRoute(route: string): ModuleRegistration | undefined {
        for (const [_, registration] of this.registry) {
            if (registration.routes?.some(r => route.startsWith(r))) {
                return registration;
            }
        }
        return undefined;
    }

    /**
     * Mark module as loaded
     */
    markLoaded(name: string): void {
        const reg = this.registry.get(name);
        if (reg) {
            reg.loaded = true;
            reg.loadedAt = new Date();
            this.logger.log(`✅ Module loaded: ${name}`);
        }
    }

    /**
     * Check if module is loaded
     */
    isLoaded(name: string): boolean {
        return this.registry.get(name)?.loaded || false;
    }

    /**
     * Check if all dependencies are loaded
     */
    areDependenciesLoaded(name: string): boolean {
        const reg = this.registry.get(name);
        if (!reg?.dependencies?.length) return true;

        return reg.dependencies.every(dep => this.isLoaded(dep));
    }

    /**
     * Get all unloaded modules
     */
    getUnloadedModules(): ModuleRegistration[] {
        return Array.from(this.registry.values()).filter(reg => !reg.loaded);
    }

    /**
     * Get statistics
     */
    getStats(): { total: number; loaded: number; byTier: Record<string, number> } {
        const all = Array.from(this.registry.values());
        const byTier: Record<string, number> = {};

        for (const tier of Object.values(ModuleTier).filter(v => typeof v === 'number')) {
            byTier[ModuleTier[tier as number]] = all.filter(r => r.tier === tier).length;
        }

        return {
            total: all.length,
            loaded: all.filter(r => r.loaded).length,
            byTier,
        };
    }

    /**
     * Promote module to a higher tier (lower number = higher priority)
     */
    promoteTier(name: string): void {
        const reg = this.registry.get(name);
        if (reg && reg.tier > ModuleTier.INSTANT) {
            const oldTier = ModuleTier[reg.tier];
            reg.tier = reg.tier - 1;
            const newTier = ModuleTier[reg.tier];
            this.logger.log(`⬆️ Promoted ${name}: ${oldTier} → ${newTier}`);
        }
    }

    /**
     * Demote module to a lower tier
     */
    demoteTier(name: string): void {
        const reg = this.registry.get(name);
        if (reg && reg.tier < ModuleTier.DORMANT) {
            const oldTier = ModuleTier[reg.tier];
            reg.tier = reg.tier + 1;
            const newTier = ModuleTier[reg.tier];
            this.logger.log(`⬇️ Demoted ${name}: ${oldTier} → ${newTier}`);
        }
    }
}
