import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ModuleUsage } from '../../domain/entities/module-usage.entity';
import { TierDecision } from '../../domain/entities/tier-decision.entity';
import { UsagePattern } from '../../domain/entities/usage-pattern.entity';
export declare class PersistenceService implements OnModuleInit {
    private readonly usageRepo;
    private readonly decisionRepo;
    private readonly patternRepo;
    private readonly logger;
    constructor(usageRepo: Repository<ModuleUsage>, decisionRepo: Repository<TierDecision>, patternRepo: Repository<UsagePattern>);
    onModuleInit(): Promise<void>;
    recordUsage(params: {
        orgId: string;
        moduleName: string;
        route?: string;
        loadTimeMs?: number;
    }): Promise<void>;
    getModuleStats(moduleName: string, orgId?: string, days?: number): Promise<{
        totalAccesses: number;
        avgLoadTimeMs: number;
        peakHour: number;
        accessesByHour: Record<number, number>;
    }>;
    recordDecision(params: {
        moduleName: string;
        fromTier?: string;
        toTier: string;
        decisionType: 'PRELOAD' | 'PROMOTE' | 'DEMOTE' | 'OPTIMIZE';
        agentId?: string;
        reason?: string;
        confidence?: number;
        orgId?: string;
    }): Promise<TierDecision>;
    validateDecision(decisionId: string, wasEffective: boolean, timeToUseMs?: number): Promise<void>;
    getDecisionHistory(params: {
        moduleName?: string;
        decisionType?: string;
        daysBack?: number;
        limit?: number;
    }): Promise<TierDecision[]>;
    getDecisionEffectiveness(): Promise<{
        total: number;
        validated: number;
        effective: number;
        effectivenessRate: number;
        avgTimeToUseMs: number;
    }>;
    savePattern(params: {
        moduleName: string;
        patternType: 'HOURLY' | 'SEQUENCE' | 'CLASSIFICATION';
        hour?: number;
        relatedModule?: string;
        count: number;
        avgResponseTimeMs?: number;
        confidence?: number;
        classification?: 'HOT' | 'WARM' | 'COLD';
        orgId?: string;
    }): Promise<UsagePattern>;
    getPatterns(moduleName: string, orgId?: string): Promise<UsagePattern[]>;
    getSequencePatterns(minConfidence?: number): Promise<Array<{
        fromModule: string;
        toModule: string;
        count: number;
        confidence: number;
    }>>;
    getHotModulesAtHour(hour: number): Promise<string[]>;
    classifyModules(periodDays?: number): Promise<void>;
    cleanup(retentionDays?: number): Promise<void>;
}
