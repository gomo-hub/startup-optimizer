import { Module, DynamicModule, Global } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
    StartupOptimizerOptions,
    StartupOptimizerAsyncOptions
} from './domain/interfaces';
import { ModuleUsage, TierDecision, UsagePattern } from './domain/entities';
import {
    ResourceMonitorService,
    TierManagerService,
    ModuleOrchestratorService,
    AutoDiscoveryService,
    PreloadStrategyService,
    UsagePatternService,
    TierManagementService,
} from './application/services';
import { UsageTrackingInterceptor, RuntimeLoaderInterceptor } from './application/interceptors';
import { TierOptimizerTool } from './application/tools';
import { StartupOptimizerAdminController } from './application/controllers';
import { OptimizerSchedulerService } from './application/schedulers';
import { AutoInstallService, MigrationService, DependencyCheckerService } from './infrastructure/auto-install';
import { PersistenceService } from './infrastructure/persistence';
import { STARTUP_OPTIMIZER_OPTIONS } from './infrastructure/constants';

@Global()
@Module({})
export class StartupOptimizerModule {
    /**
     * Static configuration
     */
    static forRoot(options: StartupOptimizerOptions = {}): DynamicModule {
        return {
            module: StartupOptimizerModule,
            imports: [
                DiscoveryModule,
                TypeOrmModule.forFeature([ModuleUsage, TierDecision, UsagePattern]),
            ],
            providers: [
                {
                    provide: STARTUP_OPTIMIZER_OPTIONS,
                    useValue: options,
                },
                ResourceMonitorService,
                TierManagerService,
                AutoDiscoveryService, // 🔍 Auto-discovers all modules
                {
                    provide: ModuleOrchestratorService,
                    useFactory: (
                        tierManager: TierManagerService,
                        resourceMonitor: ResourceMonitorService,
                    ) => {
                        // Note: LazyModuleLoader will be injected at runtime
                        const orchestrator = new ModuleOrchestratorService(
                            null as any, // LazyModuleLoader injected by NestJS
                            tierManager,
                            resourceMonitor,
                        );
                        orchestrator.configure(options);
                        return orchestrator;
                    },
                    inject: [TierManagerService, ResourceMonitorService],
                },
                DependencyCheckerService, // 🔍 Dependency verification
                MigrationService, // 🔄 Migrations SQL
                AutoInstallService, // 🔧 Auto-provisioning
                UsageTrackingInterceptor, // 📊 Tracks all requests for learning
                RuntimeLoaderInterceptor, // 🚀 Runtime dynamic loading
                PreloadStrategyService, // 🎯 AI preloading
                UsagePatternService, // 📊 Usage pattern analysis
                TierManagementService, // 🤖 AI agent interface
                TierOptimizerTool, // 🧠 Tool for AI agents
                PersistenceService, // 💾 Database persistence
                OptimizerSchedulerService, // ⏰ Cron jobs
            ],
            controllers: [
                StartupOptimizerAdminController, // 📊 Admin dashboard
            ],
            exports: [
                ModuleOrchestratorService,
                TierManagerService,
                ResourceMonitorService,
                AutoDiscoveryService,
                UsageTrackingInterceptor,
                RuntimeLoaderInterceptor,
                PreloadStrategyService,
                UsagePatternService,
                TierManagementService,
                TierOptimizerTool,
                PersistenceService,
                OptimizerSchedulerService,
            ],
        };
    }

    /**
     * Async configuration (recommended)
     */
    static forRootAsync(asyncOptions: StartupOptimizerAsyncOptions): DynamicModule {
        return {
            module: StartupOptimizerModule,
            imports: [
                DiscoveryModule,
                ...(asyncOptions.imports || []),
                TypeOrmModule.forFeature([ModuleUsage, TierDecision, UsagePattern]),
            ],
            providers: [
                {
                    provide: STARTUP_OPTIMIZER_OPTIONS,
                    useFactory: asyncOptions.useFactory,
                    inject: asyncOptions.inject || [],
                },
                ResourceMonitorService,
                TierManagerService,
                AutoDiscoveryService, // 🔍 Auto-discovers all modules
                {
                    provide: ModuleOrchestratorService,
                    useFactory: (
                        options: StartupOptimizerOptions,
                        tierManager: TierManagerService,
                        resourceMonitor: ResourceMonitorService,
                    ) => {
                        const orchestrator = new ModuleOrchestratorService(
                            null as any,
                            tierManager,
                            resourceMonitor,
                        );
                        orchestrator.configure(options);
                        return orchestrator;
                    },
                    inject: [STARTUP_OPTIMIZER_OPTIONS, TierManagerService, ResourceMonitorService],
                },
                DependencyCheckerService, // 🔍 Dependency verification
                MigrationService, // 🔄 Migrations SQL
                AutoInstallService, // 🔧 Auto-provisioning
                UsageTrackingInterceptor, // 📊 Tracks all requests for learning
                RuntimeLoaderInterceptor, // 🚀 Runtime dynamic loading
                PreloadStrategyService, // 🎯 AI preloading
                UsagePatternService, // 📊 Usage pattern analysis
                TierManagementService, // 🤖 AI agent interface
                TierOptimizerTool, // 🧠 Tool for AI agents
                PersistenceService, // 💾 Database persistence
                OptimizerSchedulerService, // ⏰ Cron jobs
            ],
            controllers: [
                StartupOptimizerAdminController, // 📊 Admin dashboard
            ],
            exports: [
                ModuleOrchestratorService,
                TierManagerService,
                ResourceMonitorService,
                AutoDiscoveryService,
                UsageTrackingInterceptor,
                RuntimeLoaderInterceptor,
                PreloadStrategyService,
                UsagePatternService,
                TierManagementService,
                TierOptimizerTool,
                PersistenceService,
                OptimizerSchedulerService,
            ],
        };
    }
}
