import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { Module } from '@nestjs/core/injector/module';
import { ModuleTier, ModuleRegistration } from '../../domain/interfaces';
import { TierManagerService } from './tier-manager.service';

/**
 * Lista de módulos core que SEMPRE devem carregar no INSTANT tier
 */
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

/**
 * Lista de módulos essenciais que devem carregar no ESSENTIAL tier
 */
const ESSENTIAL_MODULES = [
    'AuthModule',
    'HealthModule',
    'IdentityModule',
    'DatabaseModule',
];

/**
 * Lista de módulos pesados que devem ser LAZY por padrão
 */
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

/**
 * Auto-discovers all modules in the application and registers them with appropriate tiers
 */
@Injectable()
export class AutoDiscoveryService implements OnModuleInit {
    private readonly logger = new Logger(AutoDiscoveryService.name);

    constructor(
        private readonly modulesContainer: ModulesContainer,
        private readonly tierManager: TierManagerService,
    ) { }

    async onModuleInit(): Promise<void> {
        this.discoverAndRegisterModules();
    }

    /**
     * Discover all modules and auto-register with appropriate tiers
     */
    private discoverAndRegisterModules(): void {
        const modules = Array.from(this.modulesContainer.values());

        this.logger.log(`🔍 Auto-discovering ${modules.length} modules...`);

        for (const module of modules) {
            const name = this.getModuleName(module);

            // Skip internal NestJS modules
            if (this.isInternalModule(name)) continue;

            // Skip if already registered
            if (this.tierManager.getModule(name)) continue;

            const tier = this.determineTier(name);

            this.tierManager.register({
                module: module.metatype,
                tier,
                name,
                loaded: true, // Already loaded by NestJS
                loadedAt: new Date(),
            });
        }

        const stats = this.tierManager.getStats();
        this.logger.log(`✅ Auto-discovered ${stats.total} modules`);
        this.logger.log(`📊 By tier: ${JSON.stringify(stats.byTier)}`);
    }

    /**
     * Determine the appropriate tier for a module based on its name
     */
    private determineTier(moduleName: string): ModuleTier {
        if (CORE_MODULES.some(m => moduleName.includes(m))) {
            return ModuleTier.INSTANT;
        }

        if (ESSENTIAL_MODULES.some(m => moduleName.includes(m))) {
            return ModuleTier.ESSENTIAL;
        }

        if (HEAVY_MODULES.some(m => moduleName.includes(m))) {
            return ModuleTier.LAZY;
        }

        // Default: BACKGROUND for unknown modules
        return ModuleTier.BACKGROUND;
    }

    /**
     * Get module name from NestJS Module instance
     */
    private getModuleName(module: Module): string {
        return module.metatype?.name || 'UnknownModule';
    }

    /**
     * Check if module is internal NestJS module
     */
    private isInternalModule(name: string): boolean {
        const internalPatterns = [
            'InternalCoreModule',
            'StartupOptimizerModule',
            'Module', // Exact match for base Module
        ];

        return internalPatterns.some(p => name === p) ||
            name.startsWith('Internal') ||
            name.startsWith('Passport');
    }

    /**
     * Get list of discovered module names
     */
    getDiscoveredModules(): string[] {
        return this.tierManager.getStats().total > 0
            ? Array.from((this.tierManager as any).registry.keys())
            : [];
    }
}
