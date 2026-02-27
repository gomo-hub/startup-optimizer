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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TierDecision = void 0;
const typeorm_1 = require("typeorm");
let TierDecision = class TierDecision {
};
exports.TierDecision = TierDecision;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TierDecision.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'org_id', type: 'uuid', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], TierDecision.prototype, "orgId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'module_name', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], TierDecision.prototype, "moduleName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'from_tier', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], TierDecision.prototype, "fromTier", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'to_tier', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], TierDecision.prototype, "toTier", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'decision_type', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], TierDecision.prototype, "decisionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'agent_id', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], TierDecision.prototype, "agentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reason', type: 'text', nullable: true }),
    __metadata("design:type", String)
], TierDecision.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'confidence', type: 'int', default: 50 }),
    __metadata("design:type", Number)
], TierDecision.prototype, "confidence", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'was_effective', type: 'boolean', nullable: true }),
    __metadata("design:type", Boolean)
], TierDecision.prototype, "wasEffective", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'time_to_use_ms', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], TierDecision.prototype, "timeToUseMs", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'decided_at' }),
    __metadata("design:type", Date)
], TierDecision.prototype, "decidedAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'validated_at' }),
    __metadata("design:type", Date)
], TierDecision.prototype, "validatedAt", void 0);
exports.TierDecision = TierDecision = __decorate([
    (0, typeorm_1.Entity)({ name: 'startup_optimizer_tier_decisions', schema: 'gomo_hub' }),
    (0, typeorm_1.Index)(['orgId', 'moduleName']),
    (0, typeorm_1.Index)(['decidedAt'])
], TierDecision);
//# sourceMappingURL=tier-decision.entity.js.map