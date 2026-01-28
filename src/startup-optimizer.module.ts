import { Module, DynamicModule, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
    StartupOptimizerOptions,
    StartupOptimizerAsyncOptions
} from './domain/interfaces';
import { ModuleUsage } from './domain/entities';
import {
    ResourceMonitorService,
    TierManagerService,
    ModuleOrchestratorService
} from './application/services';
import { AutoInstallService } from './infrastructure/auto-install';

const STARTUP_OPTIMIZER_OPTIONS = 'STARTUP_OPTIMIZER_OPTIONS';

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
                TypeOrmModule.forFeature([ModuleUsage]),
            ],
            providers: [
                {
                    provide: STARTUP_OPTIMIZER_OPTIONS,
                    useValue: options,
                },
                ResourceMonitorService,
                TierManagerService,
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
                AutoInstallService,
            ],
            exports: [
                ModuleOrchestratorService,
                TierManagerService,
                ResourceMonitorService,
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
                ...(asyncOptions.imports || []),
                TypeOrmModule.forFeature([ModuleUsage]),
            ],
            providers: [
                {
                    provide: STARTUP_OPTIMIZER_OPTIONS,
                    useFactory: asyncOptions.useFactory,
                    inject: asyncOptions.inject || [],
                },
                ResourceMonitorService,
                TierManagerService,
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
                AutoInstallService,
            ],
            exports: [
                ModuleOrchestratorService,
                TierManagerService,
                ResourceMonitorService,
            ],
        };
    }
}
