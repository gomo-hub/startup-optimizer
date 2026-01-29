"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var StartupOptimizerModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartupOptimizerModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const entities_1 = require("./domain/entities");
const services_1 = require("./application/services");
const interceptors_1 = require("./application/interceptors");
const tools_1 = require("./application/tools");
const auto_install_1 = require("./infrastructure/auto-install");
const persistence_1 = require("./infrastructure/persistence");
const constants_1 = require("./infrastructure/constants");
let StartupOptimizerModule = StartupOptimizerModule_1 = class StartupOptimizerModule {
    static forRoot(options = {}) {
        return {
            module: StartupOptimizerModule_1,
            imports: [
                typeorm_1.TypeOrmModule.forFeature([entities_1.ModuleUsage, entities_1.TierDecision, entities_1.UsagePattern]),
            ],
            providers: [
                {
                    provide: constants_1.STARTUP_OPTIMIZER_OPTIONS,
                    useValue: options,
                },
                services_1.ResourceMonitorService,
                services_1.TierManagerService,
                services_1.AutoDiscoveryService,
                {
                    provide: services_1.ModuleOrchestratorService,
                    useFactory: (tierManager, resourceMonitor) => {
                        const orchestrator = new services_1.ModuleOrchestratorService(null, tierManager, resourceMonitor);
                        orchestrator.configure(options);
                        return orchestrator;
                    },
                    inject: [services_1.TierManagerService, services_1.ResourceMonitorService],
                },
                auto_install_1.DependencyCheckerService,
                auto_install_1.MigrationService,
                auto_install_1.AutoInstallService,
                interceptors_1.UsageTrackingInterceptor,
                interceptors_1.RuntimeLoaderInterceptor,
                services_1.PreloadStrategyService,
                services_1.UsagePatternService,
                services_1.TierManagementService,
                tools_1.TierOptimizerTool,
                persistence_1.PersistenceService,
            ],
            exports: [
                services_1.ModuleOrchestratorService,
                services_1.TierManagerService,
                services_1.ResourceMonitorService,
                services_1.AutoDiscoveryService,
                interceptors_1.UsageTrackingInterceptor,
                interceptors_1.RuntimeLoaderInterceptor,
                services_1.PreloadStrategyService,
                services_1.UsagePatternService,
                services_1.TierManagementService,
                tools_1.TierOptimizerTool,
                persistence_1.PersistenceService,
            ],
        };
    }
    static forRootAsync(asyncOptions) {
        return {
            module: StartupOptimizerModule_1,
            imports: [
                ...(asyncOptions.imports || []),
                typeorm_1.TypeOrmModule.forFeature([entities_1.ModuleUsage, entities_1.TierDecision, entities_1.UsagePattern]),
            ],
            providers: [
                {
                    provide: constants_1.STARTUP_OPTIMIZER_OPTIONS,
                    useFactory: asyncOptions.useFactory,
                    inject: asyncOptions.inject || [],
                },
                services_1.ResourceMonitorService,
                services_1.TierManagerService,
                services_1.AutoDiscoveryService,
                {
                    provide: services_1.ModuleOrchestratorService,
                    useFactory: (options, tierManager, resourceMonitor) => {
                        const orchestrator = new services_1.ModuleOrchestratorService(null, tierManager, resourceMonitor);
                        orchestrator.configure(options);
                        return orchestrator;
                    },
                    inject: [constants_1.STARTUP_OPTIMIZER_OPTIONS, services_1.TierManagerService, services_1.ResourceMonitorService],
                },
                auto_install_1.DependencyCheckerService,
                auto_install_1.MigrationService,
                auto_install_1.AutoInstallService,
                interceptors_1.UsageTrackingInterceptor,
                interceptors_1.RuntimeLoaderInterceptor,
                services_1.PreloadStrategyService,
                services_1.UsagePatternService,
                services_1.TierManagementService,
                tools_1.TierOptimizerTool,
                persistence_1.PersistenceService,
            ],
            exports: [
                services_1.ModuleOrchestratorService,
                services_1.TierManagerService,
                services_1.ResourceMonitorService,
                services_1.AutoDiscoveryService,
                interceptors_1.UsageTrackingInterceptor,
                interceptors_1.RuntimeLoaderInterceptor,
                services_1.PreloadStrategyService,
                services_1.UsagePatternService,
                services_1.TierManagementService,
                tools_1.TierOptimizerTool,
                persistence_1.PersistenceService,
            ],
        };
    }
};
exports.StartupOptimizerModule = StartupOptimizerModule;
exports.StartupOptimizerModule = StartupOptimizerModule = StartupOptimizerModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], StartupOptimizerModule);
//# sourceMappingURL=startup-optimizer.module.js.map