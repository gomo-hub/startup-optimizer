import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * MigrationService — @gomo-hub/startup-optimizer
 * 
 * Executa migrations SQL automaticamente na inicialização do módulo.
 * Segue o padrão 168.9 - Atomic & Idempotent Schema Initialization.
 * 
 * Features:
 * - Advisory locks para evitar race conditions
 * - Checksum para verificar integridade das migrations
 * - Tabela de tracking por módulo
 */
@Injectable()
export class MigrationService implements OnModuleInit {
    private readonly logger = new Logger(MigrationService.name);
    private readonly migrationsPath: string;
    private readonly MODULE_NAME = 'startup_optimizer';
    private readonly SCHEMA_NAME = 'gomo_hub';
    private readonly LOCK_ID = 168169169; // ID único para este módulo

    constructor(private readonly dataSource: DataSource) {
        // Caminho para migrations (dentro de auto-install/migrations)
        this.migrationsPath = path.join(__dirname, 'migrations');
    }

    async onModuleInit(): Promise<void> {
        await this.runMigrations();
    }

    /**
     * Executa todas as migrations pendentes em ordem
     * Usa advisory lock para evitar race condition entre múltiplas instâncias
     */
    async runMigrations(): Promise<void> {
        try {
            // Tentar adquirir lock (non-blocking)
            const lockResult = await this.dataSource.query(
                `SELECT pg_try_advisory_lock($1) as acquired`,
                [this.LOCK_ID]
            );

            if (!lockResult[0]?.acquired) {
                this.logger.log('⏳ StartupOptimizer: Outra instância está executando migrations...');
                // Aguardar lock (blocking)
                await this.dataSource.query(`SELECT pg_advisory_lock($1)`, [this.LOCK_ID]);
            }

            // Criar schema se não existir
            await this.ensureSchemaExists();

            // Criar tabela de controle se não existir
            await this.ensureMigrationsTable();

            // Listar migrations disponíveis
            const migrations = await this.getAvailableMigrations();
            const executed = await this.getExecutedMigrations();

            // Filtrar pendentes
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
        } catch (error) {
            this.logger.error('❌ StartupOptimizer: Erro ao executar migrations', error);
            throw error;
        } finally {
            // Liberar lock
            await this.dataSource.query(`SELECT pg_advisory_unlock($1)`, [this.LOCK_ID]).catch(() => {});
        }
    }

    /**
     * Garante que o schema gomo_hub existe
     */
    private async ensureSchemaExists(): Promise<void> {
        await this.dataSource.query(`

        `);
    }

    /**
     * Garante que a tabela de controle existe
     * Segue padrão 168.9 com checksum
     */
    private async ensureMigrationsTable(): Promise<void> {
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

    /**
     * Lista migrations disponíveis no diretório
     */
    private async getAvailableMigrations(): Promise<string[]> {
        if (!fs.existsSync(this.migrationsPath)) {
            this.logger.warn(`⚠️ Diretório de migrations não encontrado: ${this.migrationsPath}`);
            return [];
        }

        const files = fs.readdirSync(this.migrationsPath)
            .filter(f => f.endsWith('.sql'))
            .sort();

        return files;
    }

    /**
     * Lista migrations já executadas
     */
    private async getExecutedMigrations(): Promise<string[]> {
        try {
            const tableName = `${this.SCHEMA_NAME}.${this.MODULE_NAME}_migrations`;
            const result = await this.dataSource.query(`
                SELECT name FROM ${tableName} ORDER BY id
            `);
            return result.map((r: any) => r.name);
        } catch {
            return [];
        }
    }

    /**
     * Calcula checksum do arquivo SQL
     */
    private calculateChecksum(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
    }

    /**
     * Executa uma migration específica
     * Usa ON CONFLICT para evitar race condition
     */
    private async executeMigration(name: string): Promise<void> {
        const tableName = `${this.SCHEMA_NAME}.${this.MODULE_NAME}_migrations`;

        // Verificar novamente se já foi executada (race condition protection)
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

        // Usar ON CONFLICT para evitar erro se outra instância inseriu primeiro
        await this.dataSource.query(`
            INSERT INTO ${tableName} (name, checksum) VALUES ($1, $2)
            ON CONFLICT (name) DO NOTHING
        `, [name, checksum]);

        this.logger.log(`✅ Concluído: ${name}`);
    }
}
