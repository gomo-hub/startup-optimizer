import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { ModuleUsage } from '../../domain/entities/module-usage.entity';
import { TierDecision } from '../../domain/entities/tier-decision.entity';
import { UsagePattern } from '../../domain/entities/usage-pattern.entity';

/**
 * 💾 Persistence Service for Startup Optimizer
 * 
 * Handles all database operations for:
 * - Module usage tracking
 * - AI tier decisions
 * - Usage pattern aggregation
 * 
 * Provides learning feedback loop for AI optimization
 */
@Injectable()
export class PersistenceService implements OnModuleInit {
    private readonly logger = new Logger(PersistenceService.name);

    constructor(
        @InjectRepository(ModuleUsage)
        private readonly usageRepo: Repository<ModuleUsage>,
        @InjectRepository(TierDecision)
        private readonly decisionRepo: Repository<TierDecision>,
        @InjectRepository(UsagePattern)
        private readonly patternRepo: Repository<UsagePattern>,
    ) { }

    async onModuleInit() {
        this.logger.log('💾 Persistence Service initialized');
    }

    // ═══════════════════════════════════════════════════════════════
    // MODULE USAGE TRACKING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Record a module access
     */
    async recordUsage(params: {
        orgId: string;
        moduleName: string;
        route?: string;
        loadTimeMs?: number;
    }): Promise<void> {
        const usage = this.usageRepo.create({
            orgId: params.orgId,
            moduleName: params.moduleName,
            route: params.route,
            loadTimeMs: params.loadTimeMs,
        });

        await this.usageRepo.save(usage);
    }

    /**
     * Get usage stats for a module
     */
    async getModuleStats(moduleName: string, orgId?: string, days = 7): Promise<{
        totalAccesses: number;
        avgLoadTimeMs: number;
        peakHour: number;
        accessesByHour: Record<number, number>;
    }> {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const qb = this.usageRepo.createQueryBuilder('u')
            .where('u.module_name = :moduleName', { moduleName })
            .andWhere('u.accessed_at > :since', { since });

        if (orgId) {
            qb.andWhere('u.org_id = :orgId', { orgId });
        }

        const usages = await qb.getMany();

        // Aggregate by hour
        const accessesByHour: Record<number, number> = {};
        let totalLoadTime = 0;
        let loadTimeCount = 0;

        for (const usage of usages) {
            const hour = usage.accessedAt.getHours();
            accessesByHour[hour] = (accessesByHour[hour] || 0) + 1;

            if (usage.loadTimeMs) {
                totalLoadTime += usage.loadTimeMs;
                loadTimeCount++;
            }
        }

        // Find peak hour
        let peakHour = 0;
        let peakCount = 0;
        for (const [hour, count] of Object.entries(accessesByHour)) {
            if (count > peakCount) {
                peakCount = count;
                peakHour = parseInt(hour);
            }
        }

        return {
            totalAccesses: usages.length,
            avgLoadTimeMs: loadTimeCount > 0 ? Math.round(totalLoadTime / loadTimeCount) : 0,
            peakHour,
            accessesByHour,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // AI TIER DECISIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Record an AI tier decision
     */
    async recordDecision(params: {
        moduleName: string;
        fromTier?: string;
        toTier: string;
        decisionType: 'PRELOAD' | 'PROMOTE' | 'DEMOTE' | 'OPTIMIZE';
        agentId?: string;
        reason?: string;
        confidence?: number;
        orgId?: string;
    }): Promise<TierDecision> {
        const decision = this.decisionRepo.create({
            moduleName: params.moduleName,
            fromTier: params.fromTier,
            toTier: params.toTier,
            decisionType: params.decisionType,
            agentId: params.agentId,
            reason: params.reason,
            confidence: params.confidence || 50,
            orgId: params.orgId,
        });

        const saved = await this.decisionRepo.save(decision);
        this.logger.log(`📝 Recorded ${params.decisionType} decision: ${params.moduleName} → ${params.toTier}`);

        return saved;
    }

    /**
     * Validate a decision (was it effective?)
     */
    async validateDecision(
        decisionId: string,
        wasEffective: boolean,
        timeToUseMs?: number,
    ): Promise<void> {
        await this.decisionRepo.update(decisionId, {
            wasEffective,
            timeToUseMs,
            validatedAt: new Date(),
        });

        this.logger.log(`✅ Validated decision ${decisionId}: effective=${wasEffective}`);
    }

    /**
     * Get decision history for learning
     */
    async getDecisionHistory(params: {
        moduleName?: string;
        decisionType?: string;
        daysBack?: number;
        limit?: number;
    }): Promise<TierDecision[]> {
        const qb = this.decisionRepo.createQueryBuilder('d')
            .orderBy('d.decided_at', 'DESC');

        if (params.moduleName) {
            qb.andWhere('d.module_name = :moduleName', { moduleName: params.moduleName });
        }

        if (params.decisionType) {
            qb.andWhere('d.decision_type = :decisionType', { decisionType: params.decisionType });
        }

        if (params.daysBack) {
            const since = new Date();
            since.setDate(since.getDate() - params.daysBack);
            qb.andWhere('d.decided_at > :since', { since });
        }

        if (params.limit) {
            qb.limit(params.limit);
        }

        return qb.getMany();
    }

    /**
     * Get decision effectiveness stats
     */
    async getDecisionEffectiveness(): Promise<{
        total: number;
        validated: number;
        effective: number;
        effectivenessRate: number;
        avgTimeToUseMs: number;
    }> {
        const decisions = await this.decisionRepo.find({
            where: { wasEffective: true },
        });

        const validated = await this.decisionRepo.count({
            where: { wasEffective: true },
        });

        const effectiveDecisions = decisions.filter(d => d.wasEffective);
        const avgTimeToUse = effectiveDecisions
            .filter(d => d.timeToUseMs)
            .reduce((sum, d) => sum + (d.timeToUseMs || 0), 0) / (effectiveDecisions.length || 1);

        const total = await this.decisionRepo.count();

        return {
            total,
            validated,
            effective: effectiveDecisions.length,
            effectivenessRate: validated > 0 ? Math.round((effectiveDecisions.length / validated) * 100) : 0,
            avgTimeToUseMs: Math.round(avgTimeToUse),
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // USAGE PATTERNS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Save/update a usage pattern
     */
    async savePattern(params: {
        moduleName: string;
        patternType: 'HOURLY' | 'SEQUENCE' | 'CLASSIFICATION';
        hour?: number;
        relatedModule?: string;
        count: number;
        avgResponseTimeMs?: number;
        confidence?: number;
        classification?: 'HOT' | 'WARM' | 'COLD';
        orgId?: string;
    }): Promise<UsagePattern> {
        // Try to find existing pattern to update
        const existing = await this.patternRepo.findOne({
            where: {
                moduleName: params.moduleName,
                patternType: params.patternType,
                hour: params.hour,
                relatedModule: params.relatedModule,
                orgId: params.orgId,
            },
        });

        if (existing) {
            // Update existing
            existing.count += params.count;
            if (params.avgResponseTimeMs) {
                existing.avgResponseTimeMs = Math.round(
                    ((existing.avgResponseTimeMs || 0) + params.avgResponseTimeMs) / 2
                );
            }
            if (params.confidence) {
                existing.confidence = params.confidence;
            }
            if (params.classification) {
                existing.classification = params.classification;
            }
            return this.patternRepo.save(existing);
        }

        // Create new
        const pattern = this.patternRepo.create({
            moduleName: params.moduleName,
            patternType: params.patternType,
            hour: params.hour,
            relatedModule: params.relatedModule,
            count: params.count,
            avgResponseTimeMs: params.avgResponseTimeMs,
            confidence: params.confidence || 50,
            classification: params.classification,
            orgId: params.orgId,
        });

        return this.patternRepo.save(pattern);
    }

    /**
     * Get patterns for a module
     */
    async getPatterns(moduleName: string, orgId?: string): Promise<UsagePattern[]> {
        const where: any = { moduleName };
        if (orgId) where.orgId = orgId;

        return this.patternRepo.find({ where });
    }

    /**
     * Get sequence patterns (A → B)
     */
    async getSequencePatterns(minConfidence = 30): Promise<Array<{
        fromModule: string;
        toModule: string;
        count: number;
        confidence: number;
    }>> {
        const patterns = await this.patternRepo.find({
            where: {
                patternType: 'SEQUENCE',
                confidence: MoreThan(minConfidence),
            },
            order: { count: 'DESC' },
        });

        return patterns.map(p => ({
            fromModule: p.moduleName,
            toModule: p.relatedModule || '',
            count: p.count,
            confidence: p.confidence,
        }));
    }

    /**
     * Get hot modules at current hour
     */
    async getHotModulesAtHour(hour: number): Promise<string[]> {
        const patterns = await this.patternRepo.find({
            where: {
                patternType: 'HOURLY',
                hour,
                classification: 'HOT',
            },
            order: { count: 'DESC' },
        });

        return patterns.map(p => p.moduleName);
    }

    /**
     * Classify modules based on usage (run periodically)
     */
    async classifyModules(periodDays = 7): Promise<void> {
        const since = new Date();
        since.setDate(since.getDate() - periodDays);

        // Get all modules and their access counts
        const stats = await this.usageRepo
            .createQueryBuilder('u')
            .select('u.module_name', 'moduleName')
            .addSelect('COUNT(*)', 'accessCount')
            .where('u.accessed_at > :since', { since })
            .groupBy('u.module_name')
            .orderBy('"accessCount"', 'DESC')
            .getRawMany();

        if (stats.length === 0) return;

        // Calculate percentiles for classification
        const totalAccesses = stats.reduce((sum, s) => sum + parseInt(s.accessCount), 0);
        const avgAccesses = totalAccesses / stats.length;

        for (const stat of stats) {
            const count = parseInt(stat.accessCount);
            let classification: 'HOT' | 'WARM' | 'COLD';

            if (count > avgAccesses * 2) {
                classification = 'HOT';
            } else if (count > avgAccesses * 0.5) {
                classification = 'WARM';
            } else {
                classification = 'COLD';
            }

            await this.savePattern({
                moduleName: stat.moduleName,
                patternType: 'CLASSIFICATION',
                count,
                classification,
                confidence: Math.min(95, Math.round((count / totalAccesses) * 100 + 50)),
            });
        }

        this.logger.log(`📊 Classified ${stats.length} modules`);
    }

    // ═══════════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════════

    /**
     * Clean up old data (run periodically)
     */
    async cleanup(retentionDays = 30): Promise<void> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - retentionDays);

        // Clean old usage records
        const usageResult = await this.usageRepo.delete({
            accessedAt: Between(new Date(0), cutoff),
        });

        // Clean old decisions
        const decisionResult = await this.decisionRepo.delete({
            decidedAt: Between(new Date(0), cutoff),
        });

        this.logger.log(`🧹 Cleanup: ${usageResult.affected} usages, ${decisionResult.affected} decisions`);
    }
}
