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
exports.ModuleUsage = void 0;
const typeorm_1 = require("typeorm");
let ModuleUsage = class ModuleUsage {
};
exports.ModuleUsage = ModuleUsage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ModuleUsage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'org_id', type: 'uuid' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], ModuleUsage.prototype, "orgId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'module_name', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], ModuleUsage.prototype, "moduleName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'route', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], ModuleUsage.prototype, "route", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'load_time_ms', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ModuleUsage.prototype, "loadTimeMs", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'accessed_at' }),
    __metadata("design:type", Date)
], ModuleUsage.prototype, "accessedAt", void 0);
exports.ModuleUsage = ModuleUsage = __decorate([
    (0, typeorm_1.Entity)({ name: 'startup_optimizer_usage', schema: 'gomo_hub' }),
    (0, typeorm_1.Index)(['orgId', 'moduleName']),
    (0, typeorm_1.Index)(['orgId', 'accessedAt'])
], ModuleUsage);
//# sourceMappingURL=module-usage.entity.js.map