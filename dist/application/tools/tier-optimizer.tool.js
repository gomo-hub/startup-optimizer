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
var TierOptimizerTool_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TierOptimizerTool = void 0;
const common_1 = require("@nestjs/common");
const tier_management_service_1 = require("../services/tier-management.service");
const persistence_1 = require("../../infrastructure/persistence");
let TierOptimizerTool = TierOptimizerTool_1 = class TierOptimizerTool {
    constructor(tierManagement, persistence) {
        this.tierManagement = tierManagement;
        this.persistence = persistence;
        this.name = 'tier_optimizer';
        this.displayName = 'Tier Optimizer';
        this.description = 'Manage module loading tiers dynamically. Analyze usage patterns, preload predicted modules, and promote LAZY modules to immediate loading.';
        this.category = 'system';
        this.inputSchema = {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['analyze_patterns', 'preload_modules', 'promote_module', 'get_context', 'get_status', 'get_effectiveness'],
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
                reason: {
                    type: 'string',
                    description: 'Reason for the action (stored for learning)',
                },
                confidence: {
                    type: 'number',
                    description: 'Confidence level 0-100 for the decision',
                },
            },
            required: ['action'],
        };
        this.outputSchema = {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: { type: 'object' },
                error: { type: 'string' },
            },
        };
        this.logger = new common_1.Logger(TierOptimizerTool_1.name);
    }
    async execute(input, context) {
        const startTime = Date.now();
        const agentId = context?.agentId || 'unknown';
        try {
            let result;
            switch (input.action) {
                case 'analyze_patterns':
                    result = await this.tierManagement.analyzePatterns();
                    break;
                case 'preload_modules':
                    if (!input.moduleNames?.length) {
                        throw new Error('moduleNames required for preload action');
                    }
                    result = await this.tierManagement.preloadModules(input.moduleNames);
                    for (const moduleName of input.moduleNames) {
                        await this.persistence.recordDecision({
                            moduleName,
                            toTier: 'PRELOADED',
                            decisionType: 'PRELOAD',
                            agentId,
                            reason: input.reason || 'AI agent preload decision',
                            confidence: input.confidence || 70,
                        });
                    }
                    break;
                case 'promote_module':
                    if (!input.moduleName) {
                        throw new Error('moduleName required for promote action');
                    }
                    result = await this.tierManagement.promoteModule(input.moduleName);
                    if (result.success) {
                        await this.persistence.recordDecision({
                            moduleName: input.moduleName,
                            toTier: 'PROMOTED',
                            decisionType: 'PROMOTE',
                            agentId,
                            reason: input.reason || 'AI agent promotion decision',
                            confidence: input.confidence || 75,
                        });
                    }
                    break;
                case 'get_context':
                    result = { context: this.tierManagement.getOptimizationContext() };
                    break;
                case 'get_status':
                    if (input.moduleName) {
                        result = this.tierManagement.getModuleStatus(input.moduleName);
                    }
                    else {
                        result = this.tierManagement.getAllModuleStatuses();
                    }
                    break;
                case 'get_effectiveness':
                    result = await this.persistence.getDecisionEffectiveness();
                    break;
                default:
                    throw new Error(`Unknown action: ${input.action}`);
            }
            return {
                success: true,
                output: result,
                durationMs: Date.now() - startTime,
            };
        }
        catch (error) {
            this.logger.error(`Tool execution failed: ${error.message}`, error.stack);
            return {
                success: false,
                error: error.message,
                durationMs: Date.now() - startTime,
            };
        }
    }
};
exports.TierOptimizerTool = TierOptimizerTool;
exports.TierOptimizerTool = TierOptimizerTool = TierOptimizerTool_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tier_management_service_1.TierManagementService,
        persistence_1.PersistenceService])
], TierOptimizerTool);
//# sourceMappingURL=tier-optimizer.tool.js.map