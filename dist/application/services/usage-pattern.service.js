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
var UsagePatternService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsagePatternService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../infrastructure/constants");
let UsagePatternService = UsagePatternService_1 = class UsagePatternService {
    constructor(options) {
        this.options = options;
        this.logger = new common_1.Logger(UsagePatternService_1.name);
        this.moduleStats = new Map();
        this.accessSequence = [];
        this.maxSequenceLength = 1000;
    }
    recordAccess(moduleName, responseTimeMs, orgId) {
        let stats = this.moduleStats.get(moduleName);
        if (!stats) {
            stats = this.createEmptyStats(moduleName);
            this.moduleStats.set(moduleName, stats);
        }
        stats.totalAccesses++;
        stats.lastAccessedAt = new Date();
        stats.avgResponseTimeMs = this.updateAverage(stats.avgResponseTimeMs, responseTimeMs, stats.totalAccesses);
        const hour = new Date().getHours();
        stats.accessByHour[hour] = (stats.accessByHour[hour] || 0) + 1;
        if (orgId) {
            stats.accessByOrg[orgId] = (stats.accessByOrg[orgId] || 0) + 1;
        }
        this.accessSequence.push({ module: moduleName, timestamp: new Date() });
        if (this.accessSequence.length > this.maxSequenceLength) {
            this.accessSequence.shift();
        }
    }
    getPatterns() {
        const now = new Date();
        const currentHour = now.getHours();
        const modulesByAccess = [...this.moduleStats.entries()]
            .sort((a, b) => b[1].totalAccesses - a[1].totalAccesses);
        const hotAtThisHour = modulesByAccess
            .filter(([_, stats]) => (stats.accessByHour[currentHour] || 0) > 0)
            .map(([name, stats]) => ({
            module: name,
            accessesAtHour: stats.accessByHour[currentHour] || 0,
            percentOfTotal: Math.round(((stats.accessByHour[currentHour] || 0) / stats.totalAccesses) * 100),
        }));
        const sequences = this.detectSequences();
        const coldModules = modulesByAccess
            .filter(([_, stats]) => stats.totalAccesses < 5)
            .map(([name]) => name);
        return {
            timestamp: now,
            currentHour,
            topModules: modulesByAccess.slice(0, 10).map(([name, stats]) => ({
                module: name,
                totalAccesses: stats.totalAccesses,
                avgResponseTimeMs: stats.avgResponseTimeMs,
            })),
            hotAtThisHour,
            coldModules,
            sequences,
        };
    }
    detectSequences() {
        const sequenceMap = new Map();
        const windowMs = 60000;
        for (let i = 0; i < this.accessSequence.length - 1; i++) {
            const current = this.accessSequence[i];
            const next = this.accessSequence[i + 1];
            const timeDiff = next.timestamp.getTime() - current.timestamp.getTime();
            if (timeDiff > 0 && timeDiff < windowMs && current.module !== next.module) {
                if (!sequenceMap.has(current.module)) {
                    sequenceMap.set(current.module, new Map());
                }
                const followers = sequenceMap.get(current.module);
                followers.set(next.module, (followers.get(next.module) || 0) + 1);
            }
        }
        const sequences = [];
        for (const [from, followers] of sequenceMap.entries()) {
            for (const [to, count] of followers.entries()) {
                if (count >= 3) {
                    sequences.push({
                        fromModule: from,
                        toModule: to,
                        occurrences: count,
                        confidence: Math.min(100, count * 10),
                    });
                }
            }
        }
        return sequences.sort((a, b) => b.occurrences - a.occurrences).slice(0, 20);
    }
    getPreloadRecommendation(accessedModule) {
        const patterns = this.getPatterns();
        return patterns.sequences
            .filter(seq => seq.fromModule === accessedModule && seq.confidence >= 30)
            .map(seq => seq.toModule);
    }
    getAllStats() {
        return new Map(this.moduleStats);
    }
    importStats(stats) {
        this.moduleStats = new Map(stats);
        this.logger.log(`📊 Imported usage stats for ${stats.size} modules`);
    }
    clearStats() {
        this.moduleStats.clear();
        this.accessSequence = [];
    }
    createEmptyStats(moduleName) {
        return {
            moduleName,
            totalAccesses: 0,
            avgResponseTimeMs: 0,
            lastAccessedAt: new Date(),
            accessByHour: {},
            accessByOrg: {},
        };
    }
    updateAverage(currentAvg, newValue, count) {
        return Math.round(((currentAvg * (count - 1)) + newValue) / count);
    }
};
exports.UsagePatternService = UsagePatternService;
exports.UsagePatternService = UsagePatternService = UsagePatternService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(constants_1.STARTUP_OPTIMIZER_OPTIONS)),
    __metadata("design:paramtypes", [Object])
], UsagePatternService);
//# sourceMappingURL=usage-pattern.service.js.map