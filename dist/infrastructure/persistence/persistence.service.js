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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PersistenceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersistenceService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const module_usage_entity_1 = require("../../domain/entities/module-usage.entity");
const tier_decision_entity_1 = require("../../domain/entities/tier-decision.entity");
const usage_pattern_entity_1 = require("../../domain/entities/usage-pattern.entity");
let PersistenceService = PersistenceService_1 = class PersistenceService {
    constructor(usageRepo, decisionRepo, patternRepo) {
        this.usageRepo = usageRepo;
        this.decisionRepo = decisionRepo;
        this.patternRepo = patternRepo;
        this.logger = new common_1.Logger(PersistenceService_1.name);
    }
    async onModuleInit() {
        this.logger.log('💾 Persistence Service initialized');
    }
    async recordUsage(params) {
        const usage = this.usageRepo.create({
            orgId: params.orgId,
            moduleName: params.moduleName,
            route: params.route,
            loadTimeMs: params.loadTimeMs,
        });
        await this.usageRepo.save(usage);
    }
    async getModuleStats(moduleName, orgId, days = 7) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const qb = this.usageRepo.createQueryBuilder('u')
            .where('u.module_name = :moduleName', { moduleName })
            .andWhere('u.accessed_at > :since', { since });
        if (orgId) {
            qb.andWhere('u.org_id = :orgId', { orgId });
        }
        const usages = await qb.getMany();
        const accessesByHour = {};
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
    async recordDecision(params) {
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
    async validateDecision(decisionId, wasEffective, timeToUseMs) {
        await this.decisionRepo.update(decisionId, {
            wasEffective,
            timeToUseMs,
            validatedAt: new Date(),
        });
        this.logger.log(`✅ Validated decision ${decisionId}: effective=${wasEffective}`);
    }
    async getDecisionHistory(params) {
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
    async getDecisionEffectiveness() {
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
    async savePattern(params) {
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
            existing.count += params.count;
            if (params.avgResponseTimeMs) {
                existing.avgResponseTimeMs = Math.round(((existing.avgResponseTimeMs || 0) + params.avgResponseTimeMs) / 2);
            }
            if (params.confidence) {
                existing.confidence = params.confidence;
            }
            if (params.classification) {
                existing.classification = params.classification;
            }
            return this.patternRepo.save(existing);
        }
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
    async getPatterns(moduleName, orgId) {
        const where = { moduleName };
        if (orgId)
            where.orgId = orgId;
        return this.patternRepo.find({ where });
    }
    async getSequencePatterns(minConfidence = 30) {
        const patterns = await this.patternRepo.find({
            where: {
                patternType: 'SEQUENCE',
                confidence: (0, typeorm_2.MoreThan)(minConfidence),
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
    async getHotModulesAtHour(hour) {
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
    async classifyModules(periodDays = 7) {
        const since = new Date();
        since.setDate(since.getDate() - periodDays);
        const stats = await this.usageRepo
            .createQueryBuilder('u')
            .select('u.module_name', 'moduleName')
            .addSelect('COUNT(*)', 'accessCount')
            .where('u.accessed_at > :since', { since })
            .groupBy('u.module_name')
            .orderBy('"accessCount"', 'DESC')
            .getRawMany();
        if (stats.length === 0)
            return;
        const totalAccesses = stats.reduce((sum, s) => sum + parseInt(s.accessCount), 0);
        const avgAccesses = totalAccesses / stats.length;
        for (const stat of stats) {
            const count = parseInt(stat.accessCount);
            let classification;
            if (count > avgAccesses * 2) {
                classification = 'HOT';
            }
            else if (count > avgAccesses * 0.5) {
                classification = 'WARM';
            }
            else {
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
    async cleanup(retentionDays = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - retentionDays);
        const usageResult = await this.usageRepo.delete({
            accessedAt: (0, typeorm_2.Between)(new Date(0), cutoff),
        });
        const decisionResult = await this.decisionRepo.delete({
            decidedAt: (0, typeorm_2.Between)(new Date(0), cutoff),
        });
        this.logger.log(`🧹 Cleanup: ${usageResult.affected} usages, ${decisionResult.affected} decisions`);
    }
};
exports.PersistenceService = PersistenceService;
exports.PersistenceService = PersistenceService = PersistenceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(module_usage_entity_1.ModuleUsage)),
    __param(1, (0, typeorm_1.InjectRepository)(tier_decision_entity_1.TierDecision)),
    __param(2, (0, typeorm_1.InjectRepository)(usage_pattern_entity_1.UsagePattern)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PersistenceService);
//# sourceMappingURL=persistence.service.js.map