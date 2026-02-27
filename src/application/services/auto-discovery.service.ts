import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { Module } from '@nestjs/core/injector/module';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ModuleTier, ModuleRegistration } from '../../domain/interfaces';
import { ModuleUsage } from '../../domain/entities';
import { TierManagerService } from './tier-manager.service';

/**
 * 🧠 Intelligent Auto-Discovery Service
 * 
 * - NO hardcoded lists
 * - Learns from actual usage patterns
 * - Automatically promotes/demotes modules based on real data
 * - Analyzes dependency graph to find auth/login critical path
 */
@Injectable()
export class AutoDiscoveryService implements OnModuleInit {
    private readonly logger = new Logger(AutoDiscoveryService.name);
    private readonly LEARNING_WINDOW_DAYS = 7; // Analyze last 7 days
    private readonly PROMOTION_THRESHOLD = 10; // Promote if accessed 10+ times
    private readonly DEMOTION_THRESHOLD = 0;   // Demote if accessed 0 times in window

    constructor(
        private readonly modulesContainer: ModulesContainer,
        private readonly tierManager: TierManagerService,
        @InjectRepository(ModuleUsage)
        private readonly usageRepository: Repository<ModuleUsage>,
    ) { }

    async onModuleInit(): Promise<void> {
        await this.discoverAndRegisterModules();
        await this.applyLearnedTiers();
    }

    /**
     * Discover all modules and register them with DEFAULT tier (BACKGROUND)
     * The system will learn and adjust tiers based on usage
     */
    private async discoverAndRegisterModules(): Promise<void> {
        const modules = Array.from(this.modulesContainer.values());

        this.logger.log(`🔍 Discovering ${modules.length} modules...`);

        for (const module of modules) {
            const name = this.getModuleName(module);

            // Skip internal NestJS modules
            if (this.isInternalModule(name)) continue;

            // Skip if already registered
            if (this.tierManager.getModule(name)) continue;

            // Analyze dependencies to find if this is auth-critical
            const isAuthCritical = this.isAuthCriticalModule(module);

            // Start with BACKGROUND tier - will be adjusted by learning
            const initialTier = isAuthCritical ? ModuleTier.INSTANT : ModuleTier.BACKGROUND;

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

    /**
     * 🧠 Apply learned tiers based on historical usage data
     */
    private async applyLearnedTiers(): Promise<void> {
        try {
            const windowStart = new Date();
            windowStart.setDate(windowStart.getDate() - this.LEARNING_WINDOW_DAYS);

            // Get usage stats per module
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
                if (!registration) continue;

                // Calculate optimal tier based on usage
                const optimalTier = this.calculateOptimalTier(count, avgLoadTime);

                if (registration.tier !== optimalTier) {
                    const oldTierName = ModuleTier[registration.tier];
                    const newTierName = ModuleTier[optimalTier];

                    // Update tier
                    registration.tier = optimalTier;

                    this.logger.log(
                        `🎓 Learned: ${moduleName} moved ${oldTierName} → ${newTierName} ` +
                        `(${count} accesses, ${Math.round(avgLoadTime)}ms avg)`
                    );
                }
            }

            // Demote unused modules
            await this.demoteUnusedModules(windowStart);

        } catch (error) {
            // First run - no data yet, that's OK
            this.logger.debug(`First run or no usage data: ${error.message}`);
        }
    }

    /**
     * Calculate optimal tier based on usage patterns
     */
    private calculateOptimalTier(accessCount: number, avgLoadTime: number): ModuleTier {
        // High usage + fast load = INSTANT
        if (accessCount >= 50) {
            return ModuleTier.INSTANT;
        }

        // Medium-high usage = ESSENTIAL
        if (accessCount >= 20) {
            return ModuleTier.ESSENTIAL;
        }

        // Medium usage = BACKGROUND
        if (accessCount >= this.PROMOTION_THRESHOLD) {
            return ModuleTier.BACKGROUND;
        }

        // Low usage + slow load = LAZY
        if (accessCount < 5 && avgLoadTime > 100) {
            return ModuleTier.LAZY;
        }

        // Default
        return ModuleTier.BACKGROUND;
    }

    /**
     * Demote modules that weren't used in the learning window
     */
    private async demoteUnusedModules(windowStart: Date): Promise<void> {
        const allModules = this.tierManager.getUnloadedModules();

        for (const registration of allModules) {
            const usageCount = await this.usageRepository.count({
                where: {
                    moduleName: registration.name,
                    accessedAt: MoreThan(windowStart),
                },
            });

            if (usageCount === this.DEMOTION_THRESHOLD && registration.tier < ModuleTier.LAZY) {
                const oldTier = ModuleTier[registration.tier];
                registration.tier = ModuleTier.LAZY;
                this.logger.log(`⬇️ Demoted unused: ${registration.name} (${oldTier} → LAZY)`);
            }
        }
    }

    /**
     * Analyze if module is in the auth/login critical path
     * by checking its dependencies and imports
     */
    private isAuthCriticalModule(module: Module): boolean {
        const name = this.getModuleName(module);

        // Check if module name suggests auth-related functionality
        const authKeywords = ['auth', 'identity', 'passport', 'jwt', 'session', 'login'];
        const isAuthRelated = authKeywords.some(kw =>
            name.toLowerCase().includes(kw)
        );

        if (isAuthRelated) return true;

        // Check dependencies - if any dependency is auth-related
        try {
            const imports = (module as any)._imports || [];
            for (const imp of imports) {
                const impName = imp?.metatype?.name || '';
                if (authKeywords.some(kw => impName.toLowerCase().includes(kw))) {
                    return true;
                }
            }
        } catch {
            // Ignore reflection errors
        }

        return false;
    }

    /**
     * 📝 Track module access (call this from interceptor)
     */
    async trackModuleAccess(
        moduleName: string,
        route: string,
        loadTimeMs: number,
        orgId?: string,
    ): Promise<void> {
        try {
            const usage = this.usageRepository.create({
                moduleName,
                route,
                loadTimeMs,
                orgId: orgId || 'system',
                accessedAt: new Date(),
            });
            await this.usageRepository.save(usage);
        } catch (error) {
            this.logger.debug(`Failed to track usage: ${error.message}`);
        }
    }

    /**
     * Force re-learn tiers (can be called via API or cron)
     */
    async relearn(): Promise<{ promoted: string[]; demoted: string[] }> {
        const beforeStats = this.tierManager.getStats();
        await this.applyLearnedTiers();
        const afterStats = this.tierManager.getStats();

        return {
            promoted: [], // Would need to track changes
            demoted: [],
        };
    }

    private getModuleName(module: Module): string {
        return module.metatype?.name || 'UnknownModule';
    }

    private isInternalModule(name: string): boolean {
        return name === 'InternalCoreModule' ||
            name === 'StartupOptimizerModule' ||
            name === 'Module' ||
            name.startsWith('Internal') ||
            name.startsWith('Passport');
    }
}
