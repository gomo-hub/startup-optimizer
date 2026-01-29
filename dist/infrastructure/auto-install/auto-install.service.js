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
var AutoInstallService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoInstallService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const dependency_checker_service_1 = require("./dependency-checker.service");
const migration_service_1 = require("./migration.service");
let AutoInstallService = AutoInstallService_1 = class AutoInstallService {
    constructor(dataSource, dependencyChecker, migrationService) {
        this.dataSource = dataSource;
        this.dependencyChecker = dependencyChecker;
        this.migrationService = migrationService;
        this.logger = new common_1.Logger(AutoInstallService_1.name);
    }
    async onModuleInit() {
        await this.install();
    }
    async install() {
        try {
            this.logger.log('🚀 StartupOptimizer: Iniciando auto-install...');
            await this.dependencyChecker.verify();
            await this.migrationService.runMigrations();
            await this.verifyIntegrity();
            this.logger.log('✅ StartupOptimizer: Auto-install concluído');
        }
        catch (error) {
            this.logger.error('❌ StartupOptimizer: Erro no auto-install', error);
            throw error;
        }
    }
    async verifyIntegrity() {
        const status = await this.dependencyChecker.getStatus();
        if (!status.database) {
            throw new Error('StartupOptimizer: Falha na verificação de integridade');
        }
        this.logger.debug(`StartupOptimizer: ${status.migrations} migrations aplicadas`);
    }
    async getStatus() {
        const depStatus = await this.dependencyChecker.getStatus();
        return {
            installed: depStatus.database,
            ...depStatus,
        };
    }
};
exports.AutoInstallService = AutoInstallService;
exports.AutoInstallService = AutoInstallService = AutoInstallService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        dependency_checker_service_1.DependencyCheckerService,
        migration_service_1.MigrationService])
], AutoInstallService);
//# sourceMappingURL=auto-install.service.js.map