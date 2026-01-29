"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var ResourceMonitorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceMonitorService = void 0;
const common_1 = require("@nestjs/common");
const os = __importStar(require("os"));
let ResourceMonitorService = ResourceMonitorService_1 = class ResourceMonitorService {
    constructor() {
        this.logger = new common_1.Logger(ResourceMonitorService_1.name);
        this.snapshots = [];
        this.maxSnapshots = 100;
        this.HIGH_FREE_MEMORY_MB = 500;
        this.LOW_FREE_MEMORY_MB = 200;
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
    getSystemMemory() {
        const totalMB = Math.round(os.totalmem() / 1024 / 1024);
        const freeMB = Math.round(os.freemem() / 1024 / 1024);
        const usedMB = totalMB - freeMB;
        const usagePercent = Math.round((usedMB / totalMB) * 100);
        return { totalMB, freeMB, usedMB, usagePercent };
    }
    calculateDynamicThreshold() {
        const { totalMB, freeMB } = this.getSystemMemory();
        if (freeMB > 2000) {
            return 98;
        }
        if (totalMB >= 16000) {
            return 98;
        }
        else if (totalMB >= 8000) {
            return 95;
        }
        else {
            return 85;
        }
    }
    canLoadModule(thresholdPercent = 80) {
        const current = this.getCurrentUsage();
        const canLoad = current.memoryUsagePercent < thresholdPercent;
        if (!canLoad) {
            this.logger.warn(`Memory usage at ${current.memoryUsagePercent}% (threshold: ${thresholdPercent}%). Deferring module load.`);
        }
        return canLoad;
    }
    canLoadModuleDynamic() {
        const current = this.getCurrentUsage();
        const systemMem = this.getSystemMemory();
        const dynamicThreshold = this.calculateDynamicThreshold();
        const canLoad = current.memoryUsagePercent < dynamicThreshold;
        if (!canLoad) {
            this.logger.warn(`⚠️ Memory constrained: Heap ${current.memoryUsagePercent}% (threshold: ${dynamicThreshold}%), ` +
                `System free: ${systemMem.freeMB}MB. Deferring module load.`);
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
        const systemMem = this.getSystemMemory();
        this.logger.log(`📊 Heap: ${usage.heapUsedMB}MB / ${usage.heapTotalMB}MB (${usage.memoryUsagePercent}%) | ` +
            `System: ${systemMem.freeMB}MB free / ${systemMem.totalMB}MB total`);
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