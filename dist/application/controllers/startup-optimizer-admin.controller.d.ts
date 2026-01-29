import { TierManagerService } from '../services/tier-manager.service';
import { ModuleOrchestratorService } from '../services/module-orchestrator.service';
import { ResourceMonitorService } from '../services/resource-monitor.service';
import { TierManagementService } from '../services/tier-management.service';
import { UsagePatternService } from '../services/usage-pattern.service';
import { PersistenceService } from '../../infrastructure/persistence';
export declare class StartupOptimizerAdminController {
    private readonly tierManager;
    private readonly orchestrator;
    private readonly resourceMonitor;
    private readonly tierManagement;
    private readonly usagePattern;
    private readonly persistence;
    constructor(tierManager: TierManagerService, orchestrator: ModuleOrchestratorService, resourceMonitor: ResourceMonitorService, tierManagement: TierManagementService, usagePattern: UsagePatternService, persistence: PersistenceService);
    getDashboard(): Promise<{
        timestamp: string;
        systemHealth: {
            status: string;
            resources: {
                heapUsedMB: number;
                heapTotalMB: number;
                memoryUsagePercent: number;
            };
            memory: {
                totalMB: number;
                freeMB: number;
                usagePercent: number;
            };
            thresholds: {
                dynamic: number;
                memoryTrend: "increasing" | "stable" | "decreasing";
            };
        };
        moduleStats: {
            total: number;
            loaded: number;
            pending: number;
            loadedPercent: number;
            modules: import("../services/tier-management.service").ModuleStatus[];
        };
        tierDistribution: {
            distribution: Record<string, {
                count: number;
                loaded: number;
                modules: string[];
            }>;
            summary: {
                instantLoaded: number;
                essentialLoaded: number;
                backgroundLoaded: number;
                lazyLoaded: number;
                dormantLoaded: number;
            };
        };
        aiDecisions: {
            effectiveness: {
                total: number;
                validated: number;
                effective: number;
                effectivenessRate: number;
                avgTimeToUseMs: number;
            };
            recentDecisions: {
                id: string;
                moduleName: string;
                type: "PRELOAD" | "PROMOTE" | "DEMOTE" | "OPTIMIZE";
                fromTier: string | undefined;
                toTier: string;
                confidence: number;
                wasEffective: boolean | undefined;
                decidedAt: Date;
            }[];
        };
        usagePatterns: {
            currentHour: number;
            hotModulesNow: string[];
            topSequences: {
                fromModule: string;
                toModule: string;
                count: number;
                confidence: number;
            }[];
            analysis: import("../services/tier-management.service").TierAnalysis;
        };
    }>;
    getSystemHealth(): Promise<{
        status: string;
        resources: {
            heapUsedMB: number;
            heapTotalMB: number;
            memoryUsagePercent: number;
        };
        memory: {
            totalMB: number;
            freeMB: number;
            usagePercent: number;
        };
        thresholds: {
            dynamic: number;
            memoryTrend: "increasing" | "stable" | "decreasing";
        };
    }>;
    getModuleStats(): Promise<{
        total: number;
        loaded: number;
        pending: number;
        loadedPercent: number;
        modules: import("../services/tier-management.service").ModuleStatus[];
    }>;
    getModuleDetail(moduleName: string): Promise<{
        usage: {
            totalAccesses: number;
            avgLoadTimeMs: number;
            peakHour: number;
            accessesByHour: Record<number, number>;
        };
        patterns: import("../..").UsagePattern[];
        moduleName: string;
        isLoaded: boolean;
        tier: string;
        stats: {
            totalAccesses: number;
            avgResponseTimeMs: number;
            lastAccessedAt: Date;
        } | null;
    }>;
    getTierDistribution(): Promise<{
        distribution: Record<string, {
            count: number;
            loaded: number;
            modules: string[];
        }>;
        summary: {
            instantLoaded: number;
            essentialLoaded: number;
            backgroundLoaded: number;
            lazyLoaded: number;
            dormantLoaded: number;
        };
    }>;
    getAIDecisions(days?: number, limit?: number): Promise<{
        effectiveness: {
            total: number;
            validated: number;
            effective: number;
            effectivenessRate: number;
            avgTimeToUseMs: number;
        };
        recentDecisions: {
            id: string;
            moduleName: string;
            type: "PRELOAD" | "PROMOTE" | "DEMOTE" | "OPTIMIZE";
            fromTier: string | undefined;
            toTier: string;
            confidence: number;
            wasEffective: boolean | undefined;
            decidedAt: Date;
        }[];
    }>;
    getAIContext(): Promise<{
        context: string;
    }>;
    getUsagePatterns(): Promise<{
        currentHour: number;
        hotModulesNow: string[];
        topSequences: {
            fromModule: string;
            toModule: string;
            count: number;
            confidence: number;
        }[];
        analysis: import("../services/tier-management.service").TierAnalysis;
    }>;
    preloadModules(body: {
        moduleNames: string[];
    }): Promise<import("../services/tier-management.service").PreloadResponse>;
    promoteModule(body: {
        moduleName: string;
        reason?: string;
    }): Promise<import("../services/tier-management.service").PromotionResult>;
    classifyModules(body: {
        periodDays?: number;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    cleanup(body: {
        retentionDays?: number;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
}
