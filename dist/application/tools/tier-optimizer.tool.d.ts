import { TierManagementService, TierAnalysis, PreloadResponse, PromotionResult } from '../services/tier-management.service';
import { PersistenceService } from '../../infrastructure/persistence';
export declare class TierOptimizerTool {
    private readonly tierManagement;
    private readonly persistence;
    readonly name = "tier_optimizer";
    readonly displayName = "Tier Optimizer";
    readonly description = "Manage module loading tiers dynamically. Analyze usage patterns, preload predicted modules, and promote LAZY modules to immediate loading.";
    readonly category = "system";
    readonly inputSchema: {
        type: string;
        properties: {
            action: {
                type: string;
                enum: string[];
                description: string;
            };
            moduleNames: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            moduleName: {
                type: string;
                description: string;
            };
            reason: {
                type: string;
                description: string;
            };
            confidence: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    readonly outputSchema: {
        type: string;
        properties: {
            success: {
                type: string;
            };
            data: {
                type: string;
            };
            error: {
                type: string;
            };
        };
    };
    private readonly logger;
    constructor(tierManagement: TierManagementService, persistence: PersistenceService);
    execute(input: TierOptimizerInput, context?: any): Promise<TierOptimizerResult>;
}
export interface TierOptimizerInput {
    action: 'analyze_patterns' | 'preload_modules' | 'promote_module' | 'get_context' | 'get_status' | 'get_effectiveness';
    moduleNames?: string[];
    moduleName?: string;
    reason?: string;
    confidence?: number;
}
export interface TierOptimizerResult {
    success: boolean;
    output?: TierAnalysis | PreloadResponse | PromotionResult | any;
    error?: string;
    durationMs: number;
    cost?: number;
    metadata?: Record<string, any>;
}
