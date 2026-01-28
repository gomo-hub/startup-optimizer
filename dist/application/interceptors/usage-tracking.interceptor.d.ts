import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AutoDiscoveryService } from '../services/auto-discovery.service';
export declare class UsageTrackingInterceptor implements NestInterceptor {
    private readonly autoDiscovery;
    private readonly logger;
    constructor(autoDiscovery: AutoDiscoveryService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private extractModuleName;
}
