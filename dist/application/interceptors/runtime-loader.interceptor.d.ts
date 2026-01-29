import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ModuleOrchestratorService } from '../services/module-orchestrator.service';
import { StartupOptimizerOptions } from '../../domain/interfaces';
export declare class RuntimeLoaderInterceptor implements NestInterceptor {
    private readonly orchestrator;
    private readonly options?;
    private readonly logger;
    private routeModuleMap;
    constructor(orchestrator: ModuleOrchestratorService, options?: StartupOptimizerOptions | undefined);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private loadModuleAndProceed;
    private findModuleForRoute;
    private buildRouteModuleMap;
    registerRoute(route: string, moduleName: string): void;
    getRouteMappings(): Map<string, string>;
}
