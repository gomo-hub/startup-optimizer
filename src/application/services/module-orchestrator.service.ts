import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';
import { ModuleTier, ModuleRegistration, StartupOptimizerOptions } from '../../domain/interfaces';
import { TierManagerService } from './tier-manager.service';
import { ResourceMonitorService } from './resource-monitor.service';

/**
 * 🧠 The Brain - Orchestrates module loading based on tiers, resources, and demand
 */
@Injectable()
export class ModuleOrchestratorService implements OnApplicationBootstrap {
    private readonly logger = new Logger(ModuleOrchestratorService.name);
    private options: StartupOptimizerOptions;
    private bootstrapComplete = false;

    constructor(
        private readonly lazyLoader: LazyModuleLoader,
        private readonly tierManager: TierManagerService,
        private readonly resourceMonitor: ResourceMonitorService,
    ) { }

    /**
     * Configure the orchestrator
     */
    configure(options: StartupOptimizerOptions): void {
        this.options = options;
        this.registerTiers();
    }

    /**
     * Called after NestJS bootstrap completes
     */
    async onApplicationBootstrap(): Promise<void> {
        this.logger.log('🚀 StartupOptimizer: Application bootstrap complete');
        this.resourceMonitor.logStatus();

        // Load ESSENTIAL tier immediately after bootstrap
        await this.loadTier(ModuleTier.ESSENTIAL);

        // Schedule BACKGROUND tier loading
        const delay = this.options?.backgroundDelay || 2000;
        setTimeout(() => this.loadBackgroundTier(), delay);

        this.bootstrapComplete = true;
    }

    /**
     * Load all modules of a specific tier
     */
    async loadTier(tier: ModuleTier): Promise<void> {
        const tierName = ModuleTier[tier];
        this.logger.log(`📦 Loading tier: ${tierName}`);

        const modules = this.tierManager.getModulesByTier(tier);
        const startTime = Date.now();

        for (const registration of modules) {
            await this.loadModule(registration);
        }

        const elapsed = Date.now() - startTime;
        this.logger.log(`✅ Tier ${tierName} loaded in ${elapsed}ms (${modules.length} modules)`);
    }

    /**
     * Load a specific module
     */
    async loadModule(registration: ModuleRegistration): Promise<boolean> {
        const { name, module } = registration;

        // Already loaded?
        if (this.tierManager.isLoaded(name)) {
            return true;
        }

        // Dependencies loaded?
        if (!this.tierManager.areDependenciesLoaded(name)) {
            this.logger.warn(`⏳ Deferring ${name}: dependencies not ready`);
            return false;
        }

        // Resource check (skip for INSTANT/ESSENTIAL)
        if (registration.tier >= ModuleTier.BACKGROUND) {
            // Use dynamic memory management based on free system RAM
            if (!this.resourceMonitor.canLoadModuleDynamic()) {
                this.logger.warn(`⏳ Deferring ${name}: system memory constrained`);
                return false;
            }
        }

        try {
            const startTime = Date.now();

            // Use NestJS LazyModuleLoader
            await this.lazyLoader.load(() => module);

            const elapsed = Date.now() - startTime;
            this.tierManager.markLoaded(name);

            if (this.options?.debug) {
                this.logger.debug(`📦 ${name} lazy-loaded in ${elapsed}ms`);
            }

            return true;
        } catch (error) {
            // If error is "null reading 'load'" or similar, module is already instantiated
            // This happens when module is also in imports[] array (sync load)
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

    /**
     * Ensure a module is loaded (for lazy loading on-demand)
     */
    async ensureLoaded(moduleName: string): Promise<boolean> {
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

    /**
     * Ensure module for a route is loaded
     */
    async ensureLoadedForRoute(route: string): Promise<boolean> {
        const registration = this.tierManager.getModuleByRoute(route);
        if (!registration) {
            return true; // No lazy module for this route
        }

        return this.ensureLoaded(registration.name);
    }

    /**
     * Load BACKGROUND tier in... background
     */
    private async loadBackgroundTier(): Promise<void> {
        this.logger.log('🔄 Loading BACKGROUND tier...');
        await this.loadTier(ModuleTier.BACKGROUND);
        this.resourceMonitor.logStatus();
    }

    /**
     * Register modules from options
     */
    private registerTiers(): void {
        const tiers = this.options?.tiers;
        if (!tiers) return;

        const tierMappings: [keyof typeof tiers, ModuleTier][] = [
            ['instant', ModuleTier.INSTANT],
            ['essential', ModuleTier.ESSENTIAL],
            ['background', ModuleTier.BACKGROUND],
            ['lazy', ModuleTier.LAZY],
            ['dormant', ModuleTier.DORMANT],
        ];

        for (const [key, tier] of tierMappings) {
            const modules = tiers[key];
            if (!modules?.length) continue;

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

    /**
     * Get current stats
     */
    getStats() {
        return {
            modules: this.tierManager.getStats(),
            resources: this.resourceMonitor.getCurrentUsage(),
            bootstrapComplete: this.bootstrapComplete,
        };
    }
}
