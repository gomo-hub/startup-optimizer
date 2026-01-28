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
var UsageTrackingInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageTrackingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const auto_discovery_service_1 = require("../services/auto-discovery.service");
let UsageTrackingInterceptor = UsageTrackingInterceptor_1 = class UsageTrackingInterceptor {
    constructor(autoDiscovery) {
        this.autoDiscovery = autoDiscovery;
        this.logger = new common_1.Logger(UsageTrackingInterceptor_1.name);
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const startTime = Date.now();
        const controller = context.getClass();
        const moduleName = this.extractModuleName(controller);
        const route = request?.url || request?.path || 'unknown';
        const orgId = request?.user?.orgId || request?.headers?.['x-org-id'] || 'system';
        return next.handle().pipe((0, operators_1.tap)({
            next: () => {
                const loadTime = Date.now() - startTime;
                this.autoDiscovery.trackModuleAccess(moduleName, route, loadTime, orgId).catch(() => { });
            },
            error: () => {
                const loadTime = Date.now() - startTime;
                this.autoDiscovery.trackModuleAccess(moduleName, route, loadTime, orgId).catch(() => { });
            },
        }));
    }
    extractModuleName(controller) {
        const name = controller?.name || 'UnknownController';
        const module = Reflect.getMetadata('__module__', controller);
        if (module?.name) {
            return module.name;
        }
        return name.replace('Controller', 'Module');
    }
};
exports.UsageTrackingInterceptor = UsageTrackingInterceptor;
exports.UsageTrackingInterceptor = UsageTrackingInterceptor = UsageTrackingInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auto_discovery_service_1.AutoDiscoveryService])
], UsageTrackingInterceptor);
//# sourceMappingURL=usage-tracking.interceptor.js.map