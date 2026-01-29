import { ModuleTier, ModuleRegistration } from '../../domain/interfaces';
export declare class TierManagerService {
    private readonly logger;
    private readonly registry;
    register(registration: ModuleRegistration): void;
    registerBulk(registrations: ModuleRegistration[]): void;
    getModulesByTier(tier: ModuleTier): ModuleRegistration[];
    getModule(name: string): ModuleRegistration | undefined;
    getModuleByRoute(route: string): ModuleRegistration | undefined;
    markLoaded(name: string): void;
    isLoaded(name: string): boolean;
    areDependenciesLoaded(name: string): boolean;
    getUnloadedModules(): ModuleRegistration[];
    getStats(): {
        total: number;
        loaded: number;
        byTier: Record<string, number>;
    };
    promoteTier(name: string): void;
    demoteTier(name: string): void;
}
