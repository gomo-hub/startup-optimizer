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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MigrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
let MigrationService = MigrationService_1 = class MigrationService {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(MigrationService_1.name);
        this.MODULE_NAME = 'startup_optimizer';
        this.SCHEMA_NAME = 'gomo_hub';
        this.LOCK_ID = 168169169;
        this.migrationsPath = path.join(__dirname, 'migrations');
    }
    async onModuleInit() {
        await this.runMigrations();
    }
    async runMigrations() {
        try {
            const lockResult = await this.dataSource.query(`SELECT pg_try_advisory_lock($1) as acquired`, [this.LOCK_ID]);
            if (!lockResult[0]?.acquired) {
                this.logger.log('⏳ StartupOptimizer: Outra instância está executando migrations...');
                await this.dataSource.query(`SELECT pg_advisory_lock($1)`, [this.LOCK_ID]);
            }
            await this.ensureSchemaExists();
            await this.ensureMigrationsTable();
            const migrations = await this.getAvailableMigrations();
            const executed = await this.getExecutedMigrations();
            const pending = migrations.filter(m => !executed.includes(m));
            if (pending.length === 0) {
                this.logger.log('✅ StartupOptimizer: Nenhuma migration pendente');
                return;
            }
            this.logger.log(`📦 StartupOptimizer: Executando ${pending.length} migrations...`);
            for (const migration of pending) {
                await this.executeMigration(migration);
            }
            this.logger.log('✅ StartupOptimizer: Todas as migrations executadas');
        }
        catch (error) {
            this.logger.error('❌ StartupOptimizer: Erro ao executar migrations', error);
            throw error;
        }
        finally {
            await this.dataSource.query(`SELECT pg_advisory_unlock($1)`, [this.LOCK_ID]).catch(() => { });
        }
    }
    async ensureSchemaExists() {
        await this.dataSource.query(`
            CREATE SCHEMA IF NOT EXISTS ${this.SCHEMA_NAME}
        `);
    }
    async ensureMigrationsTable() {
        const tableName = `${this.SCHEMA_NAME}.${this.MODULE_NAME}_migrations`;
        await this.dataSource.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = '${this.SCHEMA_NAME}'
                    AND table_name = '${this.MODULE_NAME}_migrations'
                ) THEN
                    CREATE TABLE ${tableName} (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL UNIQUE,
                        checksum VARCHAR(64),
                        executed_at TIMESTAMP DEFAULT NOW()
                    );
                END IF;
            END $$;
        `);
    }
    async getAvailableMigrations() {
        if (!fs.existsSync(this.migrationsPath)) {
            this.logger.warn(`⚠️ Diretório de migrations não encontrado: ${this.migrationsPath}`);
            return [];
        }
        const files = fs.readdirSync(this.migrationsPath)
            .filter(f => f.endsWith('.sql'))
            .sort();
        return files;
    }
    async getExecutedMigrations() {
        try {
            const tableName = `${this.SCHEMA_NAME}.${this.MODULE_NAME}_migrations`;
            const result = await this.dataSource.query(`
                SELECT name FROM ${tableName} ORDER BY id
            `);
            return result.map((r) => r.name);
        }
        catch {
            return [];
        }
    }
    calculateChecksum(content) {
        return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
    }
    async executeMigration(name) {
        const tableName = `${this.SCHEMA_NAME}.${this.MODULE_NAME}_migrations`;
        const alreadyExecuted = await this.dataSource.query(`
            SELECT 1 FROM ${tableName} WHERE name = $1
        `, [name]);
        if (alreadyExecuted.length > 0) {
            this.logger.debug(`⏭️ Skipping ${name} (already executed)`);
            return;
        }
        const filePath = path.join(this.migrationsPath, name);
        const sql = fs.readFileSync(filePath, 'utf-8');
        const checksum = this.calculateChecksum(sql);
        this.logger.log(`🔄 Executando: ${name}`);
        await this.dataSource.query(sql);
        await this.dataSource.query(`
            INSERT INTO ${tableName} (name, checksum) VALUES ($1, $2)
            ON CONFLICT (name) DO NOTHING
        `, [name, checksum]);
        this.logger.log(`✅ Concluído: ${name}`);
    }
};
exports.MigrationService = MigrationService;
exports.MigrationService = MigrationService = MigrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], MigrationService);
//# sourceMappingURL=migration.service.js.map