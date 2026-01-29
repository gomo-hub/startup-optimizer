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
var RuntimeLoaderInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeLoaderInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const module_orchestrator_service_1 = require("../services/module-orchestrator.service");
const constants_1 = require("../../infrastructure/constants");
let RuntimeLoaderInterceptor = RuntimeLoaderInterceptor_1 = class RuntimeLoaderInterceptor {
    constructor(orchestrator, options) {
        this.orchestrator = orchestrator;
        this.options = options;
        this.logger = new common_1.Logger(RuntimeLoaderInterceptor_1.name);
        this.routeModuleMap = new Map();
        this.buildRouteModuleMap();
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const path = request?.url || request?.path || '';
        const moduleName = this.findModuleForRoute(path);
        if (moduleName && !this.orchestrator.isLoaded(moduleName)) {
            if (this.options?.debug) {
                this.logger.log(`🔄 Runtime loading ${moduleName} for route ${path}`);
            }
            return (0, rxjs_1.from)(this.loadModuleAndProceed(moduleName)).pipe((0, operators_1.switchMap)(() => next.handle()));
        }
        return next.handle();
    }
    async loadModuleAndProceed(moduleName) {
        const startTime = Date.now();
        const loaded = await this.orchestrator.ensureLoaded(moduleName);
        const elapsed = Date.now() - startTime;
        if (loaded) {
            this.logger.log(`⚡ Runtime loaded ${moduleName} in ${elapsed}ms`);
        }
        else {
            this.logger.warn(`⚠️ Failed to runtime load ${moduleName}`);
        }
    }
    findModuleForRoute(path) {
        if (this.routeModuleMap.has(path)) {
            return this.routeModuleMap.get(path);
        }
        for (const [route, moduleName] of this.routeModuleMap.entries()) {
            if (path.startsWith(route.replace('*', ''))) {
                return moduleName;
            }
        }
        return undefined;
    }
    buildRouteModuleMap() {
        const tiers = this.options?.tiers;
        if (!tiers)
            return;
        const lazyModules = tiers.lazy || [];
        const dormantModules = tiers.dormant || [];
        const allLazyModules = [...lazyModules, ...dormantModules];
        for (const moduleConfig of allLazyModules) {
            if (typeof moduleConfig === 'object' && moduleConfig.routes && moduleConfig.name) {
                for (const route of moduleConfig.routes) {
                    this.routeModuleMap.set(route, moduleConfig.name);
                }
            }
        }
        if (this.options?.debug && this.routeModuleMap.size > 0) {
            this.logger.debug(`📍 Route mappings: ${JSON.stringify([...this.routeModuleMap.entries()])}`);
        }
    }
    registerRoute(route, moduleName) {
        this.routeModuleMap.set(route, moduleName);
        if (this.options?.debug) {
            this.logger.debug(`📍 Registered route ${route} → ${moduleName}`);
        }
    }
    getRouteMappings() {
        return new Map(this.routeModuleMap);
    }
};
exports.RuntimeLoaderInterceptor = RuntimeLoaderInterceptor;
exports.RuntimeLoaderInterceptor = RuntimeLoaderInterceptor = RuntimeLoaderInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, common_1.Inject)(constants_1.STARTUP_OPTIMIZER_OPTIONS)),
    __metadata("design:paramtypes", [module_orchestrator_service_1.ModuleOrchestratorService, Object])
], RuntimeLoaderInterceptor);
//# sourceMappingURL=runtime-loader.interceptor.js.map