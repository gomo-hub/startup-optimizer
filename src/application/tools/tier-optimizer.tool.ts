import { Injectable, Logger } from '@nestjs/common';
import { TierManagementService, TierAnalysis, PreloadResponse, PromotionResult } from '../services/tier-management.service';

/**
 * 🤖 Tier Optimizer Tool for AI Agents
 * 
 * Implements ITool interface from @gomo-hub/ai-agents
 * Allows AI agents to dynamically manage module tiers
 * 
 * Usage in AI Agent:
 * - "analyze_patterns" - Get usage patterns and recommendations
 * - "preload_modules" - Preload specific modules
 * - "promote_module" - Load a LAZY/DORMANT module immediately
 * - "get_context" - Get optimization context for LLM
 */
@Injectable()
export class TierOptimizerTool {
    readonly name = 'tier_optimizer';
    readonly displayName = 'Tier Optimizer';
    readonly description = 'Manage module loading tiers dynamically. Analyze usage patterns, preload predicted modules, and promote LAZY modules to immediate loading.';
    readonly category = 'system';

    readonly inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['analyze_patterns', 'preload_modules', 'promote_module', 'get_context', 'get_status'],
                description: 'Action to perform',
            },
            moduleNames: {
                type: 'array',
                items: { type: 'string' },
                description: 'Module names for preload action',
            },
            moduleName: {
                type: 'string',
                description: 'Single module name for promote/status action',
            },
        },
        required: ['action'],
    };

    readonly outputSchema = {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            error: { type: 'string' },
        },
    };

    private readonly logger = new Logger(TierOptimizerTool.name);

    constructor(
        private readonly tierManagement: TierManagementService,
    ) { }

    /**
     * Execute tool action
     * Called by AI Agent runtime
     */
    async execute(input: TierOptimizerInput, context?: any): Promise<TierOptimizerResult> {
        const startTime = Date.now();

        try {
            let result: any;

            switch (input.action) {
                case 'analyze_patterns':
                    result = await this.tierManagement.analyzePatterns();
                    break;

                case 'preload_modules':
                    if (!input.moduleNames?.length) {
                        throw new Error('moduleNames required for preload action');
                    }
                    result = await this.tierManagement.preloadModules(input.moduleNames);
                    break;

                case 'promote_module':
                    if (!input.moduleName) {
                        throw new Error('moduleName required for promote action');
                    }
                    result = await this.tierManagement.promoteModule(input.moduleName);
                    break;

                case 'get_context':
                    result = { context: this.tierManagement.getOptimizationContext() };
                    break;

                case 'get_status':
                    if (input.moduleName) {
                        result = this.tierManagement.getModuleStatus(input.moduleName);
                    } else {
                        result = this.tierManagement.getAllModuleStatuses();
                    }
                    break;

                default:
                    throw new Error(`Unknown action: ${input.action}`);
            }

            return {
                success: true,
                output: result,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            this.logger.error(`Tool execution failed: ${error.message}`, error.stack);

            return {
                success: false,
                error: error.message,
                durationMs: Date.now() - startTime,
            };
        }
    }
}

// Input/Output types
export interface TierOptimizerInput {
    action: 'analyze_patterns' | 'preload_modules' | 'promote_module' | 'get_context' | 'get_status';
    moduleNames?: string[];
    moduleName?: string;
}

export interface TierOptimizerResult {
    success: boolean;
    output?: TierAnalysis | PreloadResponse | PromotionResult | any;
    error?: string;
    durationMs: number;
    cost?: number;
    metadata?: Record<string, any>;
}
