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
var AutoInstallService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoInstallService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let AutoInstallService = AutoInstallService_1 = class AutoInstallService {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(AutoInstallService_1.name);
    }
    async onModuleInit() {
        await this.runMigrations();
    }
    async runMigrations() {
        const migrationsPath = path.join(__dirname, 'migrations');
        if (!fs.existsSync(migrationsPath)) {
            this.logger.warn('⚠️ No migrations directory found');
            return;
        }
        const files = fs.readdirSync(migrationsPath)
            .filter(f => f.endsWith('.sql'))
            .sort();
        for (const file of files) {
            try {
                const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
                const tableName = this.extractTableName(sql);
                if (tableName) {
                    const exists = await this.tableExists(tableName);
                    if (exists) {
                        this.logger.debug(`⏭️ Skipping ${file} - table exists`);
                        continue;
                    }
                }
                await this.dataSource.query(sql);
                this.logger.log(`✅ Executed migration: ${file}`);
            }
            catch (error) {
                this.logger.error(`❌ Migration failed: ${file} - ${error.message}`);
            }
        }
    }
    extractTableName(sql) {
        const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
        return match ? match[1] : null;
    }
    async tableExists(tableName) {
        try {
            const result = await this.dataSource.query(`SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = $1
                )`, [tableName]);
            return result[0]?.exists || false;
        }
        catch {
            return false;
        }
    }
};
exports.AutoInstallService = AutoInstallService;
exports.AutoInstallService = AutoInstallService = AutoInstallService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], AutoInstallService);
//# sourceMappingURL=auto-install.service.js.map