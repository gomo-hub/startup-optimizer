"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ResourceMonitorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceMonitorService = void 0;
const common_1 = require("@nestjs/common");
let ResourceMonitorService = ResourceMonitorService_1 = class ResourceMonitorService {
    constructor() {
        this.logger = new common_1.Logger(ResourceMonitorService_1.name);
        this.snapshots = [];
        this.maxSnapshots = 100;
    }
    getCurrentUsage() {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
        const externalMB = Math.round(memUsage.external / 1024 / 1024);
        const snapshot = {
            memoryUsagePercent: Math.round((heapUsedMB / heapTotalMB) * 100),
            heapUsedMB,
            heapTotalMB,
            externalMB,
            timestamp: new Date(),
        };
        this.addSnapshot(snapshot);
        return snapshot;
    }
    canLoadModule(thresholdPercent = 80) {
        const current = this.getCurrentUsage();
        const canLoad = current.memoryUsagePercent < thresholdPercent;
        if (!canLoad) {
            this.logger.warn(`Memory usage at ${current.memoryUsagePercent}% (threshold: ${thresholdPercent}%). Deferring module load.`);
        }
        return canLoad;
    }
    getAverageUsage(lastN = 10) {
        const recentSnapshots = this.snapshots.slice(-lastN);
        if (recentSnapshots.length === 0)
            return 0;
        const sum = recentSnapshots.reduce((acc, s) => acc + s.memoryUsagePercent, 0);
        return Math.round(sum / recentSnapshots.length);
    }
    getMemoryTrend() {
        if (this.snapshots.length < 5)
            return 'stable';
        const recent = this.snapshots.slice(-5);
        const first = recent[0].memoryUsagePercent;
        const last = recent[recent.length - 1].memoryUsagePercent;
        const diff = last - first;
        if (diff > 10)
            return 'increasing';
        if (diff < -10)
            return 'decreasing';
        return 'stable';
    }
    logStatus() {
        const usage = this.getCurrentUsage();
        this.logger.log(`📊 Memory: ${usage.heapUsedMB}MB / ${usage.heapTotalMB}MB (${usage.memoryUsagePercent}%)`);
    }
    addSnapshot(snapshot) {
        this.snapshots.push(snapshot);
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots.shift();
        }
    }
};
exports.ResourceMonitorService = ResourceMonitorService;
exports.ResourceMonitorService = ResourceMonitorService = ResourceMonitorService_1 = __decorate([
    (0, common_1.Injectable)()
], ResourceMonitorService);
//# sourceMappingURL=resource-monitor.service.js.map