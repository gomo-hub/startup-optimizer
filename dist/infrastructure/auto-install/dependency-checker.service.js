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
var DependencyCheckerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyCheckerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let DependencyCheckerService = DependencyCheckerService_1 = class DependencyCheckerService {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(DependencyCheckerService_1.name);
    }
    async verify() {
        this.logger.log('🔍 StartupOptimizer: Verificando dependências...');
        try {
            await this.checkDatabaseConnection();
            await this.checkRequiredExtensions();
            this.logger.log('✅ StartupOptimizer: Todas as dependências verificadas');
        }
        catch (error) {
            this.logger.error('❌ StartupOptimizer: Falha na verificação de dependências', error);
            throw error;
        }
    }
    async checkDatabaseConnection() {
        try {
            await this.dataSource.query('SELECT 1');
            this.logger.debug('✓ Database connection OK');
        }
        catch (error) {
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }
    async checkRequiredExtensions() {
        const requiredExtensions = ['uuid-ossp'];
        for (const ext of requiredExtensions) {
            try {
                const result = await this.dataSource.query(`SELECT extname FROM pg_extension WHERE extname = $1`, [ext]);
                if (result.length === 0) {
                    await this.dataSource.query(`CREATE EXTENSION IF NOT EXISTS "${ext}"`);
                    this.logger.log(`✓ Extension ${ext} created`);
                }
                else {
                    this.logger.debug(`✓ Extension ${ext} exists`);
                }
            }
            catch (error) {
                this.logger.warn(`⚠ Could not verify extension ${ext}: ${error.message}`);
            }
        }
    }
    async isModuleInstalled(moduleName) {
        try {
            const result = await this.dataSource.query(`
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = $1
            `, [`${moduleName}_migrations`]);
            return result.length > 0;
        }
        catch {
            return false;
        }
    }
    async waitForModule(moduleName, maxWaitMs = 30000) {
        const startTime = Date.now();
        const checkInterval = 500;
        while (Date.now() - startTime < maxWaitMs) {
            if (await this.isModuleInstalled(moduleName)) {
                this.logger.log(`✅ Dependência disponível: @gomo-hub/${moduleName}`);
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        this.logger.warn(`⚠️ Timeout aguardando: @gomo-hub/${moduleName}`);
        return false;
    }
    async getStatus() {
        let database = false;
        const extensions = [];
        let migrations = 0;
        try {
            await this.dataSource.query('SELECT 1');
            database = true;
        }
        catch { }
        try {
            const extResult = await this.dataSource.query(`SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp')`);
            extensions.push(...extResult.map((r) => r.extname));
        }
        catch { }
        try {
            const migrationResult = await this.dataSource.query(`SELECT COUNT(*) as count FROM startup_optimizer_migrations`);
            migrations = parseInt(migrationResult[0]?.count || '0', 10);
        }
        catch { }
        return { database, extensions, migrations };
    }
};
exports.DependencyCheckerService = DependencyCheckerService;
exports.DependencyCheckerService = DependencyCheckerService = DependencyCheckerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], DependencyCheckerService);
//# sourceMappingURL=dependency-checker.service.js.map