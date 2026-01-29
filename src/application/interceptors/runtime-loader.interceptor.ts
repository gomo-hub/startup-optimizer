import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
    Inject,
    Optional,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ModuleOrchestratorService } from '../services/module-orchestrator.service';
import { STARTUP_OPTIMIZER_OPTIONS } from '../../infrastructure/constants';
import { StartupOptimizerOptions } from '../../domain/interfaces';

/**
 * 🚀 Runtime Loader Interceptor
 * 
 * Automatically loads LAZY/DORMANT modules when their routes are accessed.
 * This enables true runtime dynamic loading without server restart.
 * 
 * Flow:
 * 1. Request arrives for a route
 * 2. Interceptor checks if associated module is loaded
 * 3. If not loaded → calls ensureLoaded() to load it immediately
 * 4. Request proceeds normally once module is available
 */
@Injectable()
export class RuntimeLoaderInterceptor implements NestInterceptor {
    private readonly logger = new Logger(RuntimeLoaderInterceptor.name);

    // Map routes to module names for runtime loading
    private routeModuleMap: Map<string, string> = new Map();

    constructor(
        private readonly orchestrator: ModuleOrchestratorService,
        @Optional() @Inject(STARTUP_OPTIMIZER_OPTIONS)
        private readonly options?: StartupOptimizerOptions,
    ) {
        this.buildRouteModuleMap();
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const path = request?.url || request?.path || '';

        // Find module for this route
        const moduleName = this.findModuleForRoute(path);

        if (moduleName && !this.orchestrator.isLoaded(moduleName)) {
            // Module not loaded - load it now!
            if (this.options?.debug) {
                this.logger.log(`🔄 Runtime loading ${moduleName} for route ${path}`);
            }

            // Load module then proceed with request
            return from(this.loadModuleAndProceed(moduleName)).pipe(
                switchMap(() => next.handle())
            );
        }

        // Module already loaded or no mapping found
        return next.handle();
    }

    /**
     * Load a module at runtime
     */
    private async loadModuleAndProceed(moduleName: string): Promise<void> {
        const startTime = Date.now();

        const loaded = await this.orchestrator.ensureLoaded(moduleName);

        const elapsed = Date.now() - startTime;
        if (loaded) {
            this.logger.log(`⚡ Runtime loaded ${moduleName} in ${elapsed}ms`);
        } else {
            this.logger.warn(`⚠️ Failed to runtime load ${moduleName}`);
        }
    }

    /**
     * Find module name for a given route path
     * Routes can be registered via options or discovered automatically
     */
    private findModuleForRoute(path: string): string | undefined {
        // Exact match
        if (this.routeModuleMap.has(path)) {
            return this.routeModuleMap.get(path);
        }

        // Prefix match (e.g., /vsl/* → VslModule)
        for (const [route, moduleName] of this.routeModuleMap.entries()) {
            if (path.startsWith(route.replace('*', ''))) {
                return moduleName;
            }
        }

        return undefined;
    }

    /**
     * Build route-to-module mapping from tier configurations
     */
    private buildRouteModuleMap(): void {
        const tiers = this.options?.tiers;
        if (!tiers) return;

        // Build map from LAZY tier modules (they have routes defined)
        const lazyModules = tiers.lazy || [];
        const dormantModules = tiers.dormant || [];
        const allLazyModules = [...lazyModules, ...dormantModules];

        for (const moduleConfig of allLazyModules) {
            // moduleConfig can be a class or {module, routes} object
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

    /**
     * Register a route-to-module mapping at runtime
     * Can be called by AI agents to set up dynamic routes
     */
    registerRoute(route: string, moduleName: string): void {
        this.routeModuleMap.set(route, moduleName);
        if (this.options?.debug) {
            this.logger.debug(`📍 Registered route ${route} → ${moduleName}`);
        }
    }

    /**
     * Get all registered route mappings
     */
    getRouteMappings(): Map<string, string> {
        return new Map(this.routeModuleMap);
    }
}
