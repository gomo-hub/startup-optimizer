import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AutoDiscoveryService } from '../services/auto-discovery.service';

/**
 * 📊 Usage Tracking Interceptor
 * 
 * Automatically tracks which modules/routes are accessed
 * This data feeds the learning algorithm
 */
@Injectable()
export class UsageTrackingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(UsageTrackingInterceptor.name);

    constructor(private readonly autoDiscovery: AutoDiscoveryService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const startTime = Date.now();

        // Get controller/module info
        const controller = context.getClass();
        const moduleName = this.extractModuleName(controller);
        const route = request?.url || request?.path || 'unknown';

        // Get tenant/org from request (if available)
        const orgId = request?.user?.orgId || request?.headers?.['x-org-id'] || 'system';

        return next.handle().pipe(
            tap({
                next: () => {
                    const loadTime = Date.now() - startTime;

                    // Track usage asynchronously (don't block response)
                    this.autoDiscovery.trackModuleAccess(
                        moduleName,
                        route,
                        loadTime,
                        orgId,
                    ).catch(() => { }); // Ignore tracking errors
                },
                error: () => {
                    // Also track errors (module was still accessed)
                    const loadTime = Date.now() - startTime;
                    this.autoDiscovery.trackModuleAccess(
                        moduleName,
                        route,
                        loadTime,
                        orgId,
                    ).catch(() => { });
                },
            }),
        );
    }

    /**
     * Extract module name from controller
     */
    private extractModuleName(controller: any): string {
        const name = controller?.name || 'UnknownController';

        // Try to get module name from metadata
        const module = Reflect.getMetadata('__module__', controller);
        if (module?.name) {
            return module.name;
        }

        // Fallback: derive from controller name
        // UserController -> UserModule
        return name.replace('Controller', 'Module');
    }
}
