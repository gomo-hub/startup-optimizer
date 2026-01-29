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
exports.UsagePattern = void 0;
const typeorm_1 = require("typeorm");
let UsagePattern = class UsagePattern {
};
exports.UsagePattern = UsagePattern;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UsagePattern.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'org_id', type: 'uuid', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], UsagePattern.prototype, "orgId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'module_name', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], UsagePattern.prototype, "moduleName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pattern_type', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], UsagePattern.prototype, "patternType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hour', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], UsagePattern.prototype, "hour", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'related_module', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], UsagePattern.prototype, "relatedModule", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], UsagePattern.prototype, "count", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'avg_response_time_ms', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], UsagePattern.prototype, "avgResponseTimeMs", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'confidence', type: 'int', default: 50 }),
    __metadata("design:type", Number)
], UsagePattern.prototype, "confidence", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'classification', type: 'varchar', length: 10, nullable: true }),
    __metadata("design:type", String)
], UsagePattern.prototype, "classification", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'period_start', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], UsagePattern.prototype, "periodStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'period_end', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], UsagePattern.prototype, "periodEnd", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], UsagePattern.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], UsagePattern.prototype, "updatedAt", void 0);
exports.UsagePattern = UsagePattern = __decorate([
    (0, typeorm_1.Entity)('startup_optimizer_patterns'),
    (0, typeorm_1.Index)(['orgId', 'moduleName']),
    (0, typeorm_1.Index)(['patternType'])
], UsagePattern);
//# sourceMappingURL=usage-pattern.entity.js.map