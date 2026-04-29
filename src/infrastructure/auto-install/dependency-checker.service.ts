import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * DependencyCheckerService — @gomo-hub/startup-optimizer
 * 
 * Verifica pré-requisitos e dependências antes de executar migrations.
 * Padrão Enterprise Híbrido: Fail-fast com diagnóstico rico.
 * 
 * @standard 300.95 - Auto-Install Infrastructure Mandate
 */
@Injectable()
export class DependencyCheckerService {
    private readonly logger = new Logger(DependencyCheckerService.name);

    constructor(private readonly dataSource: DataSource) { }

    /**
     * Verifica todas as dependências necessárias
     * @throws Error se alguma dependência crítica falhar
     */
    async verify(): Promise<void> {
        this.logger.log('🔍 StartupOptimizer: Verificando dependências...');

        try {
            await this.checkDatabaseConnection();
            await this.checkRequiredExtensions();

            this.logger.log('✅ StartupOptimizer: Todas as dependências verificadas');
        } catch (error) {
            this.logger.error('❌ StartupOptimizer: Falha na verificação de dependências', error);
            throw error;
        }
    }

    /**
     * Verifica conexão com o banco de dados
     */
    private async checkDatabaseConnection(): Promise<void> {
        try {
            await this.dataSource.query('SELECT 1');
            this.logger.debug('✓ Database connection OK');
        } catch (error) {
            throw new Error(`Database connection failed: ${(error as Error).message}`);
        }
    }

    /**
     * Verifica e cria extensões PostgreSQL necessárias
     */
    private async checkRequiredExtensions(): Promise<void> {
        const requiredExtensions = ['uuid-ossp'];

        for (const ext of requiredExtensions) {
            try {
                const result = await this.dataSource.query(
                    `SELECT extname FROM pg_extension WHERE extname = $1`,
                    [ext]
                );

                if (result.length === 0) {
                    await this.dataSource.query(`CREATE EXTENSION IF NOT EXISTS "${ext}"`);
                    this.logger.log(`✓ Extension ${ext} created`);
                } else {
                    this.logger.debug(`✓ Extension ${ext} exists`);
                }
            } catch (error) {
                this.logger.warn(`⚠ Could not verify extension ${ext}: ${(error as Error).message}`);
            }
        }
    }

    /**
     * Verifica se outro módulo @gomo-hub está instalado
     * @param moduleName Nome do módulo (ex: 'identity', 'websocket')
     */
    async isModuleInstalled(moduleName: string): Promise<boolean> {
        try {
            const result = await this.dataSource.query(`
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = $1
            `, [`${moduleName}_migrations`]);
            return result.length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Aguarda até que uma dependência esteja disponível
     * @param moduleName Nome do módulo dependente
     * @param maxWaitMs Tempo máximo de espera em ms
     */
    async waitForModule(moduleName: string, maxWaitMs: number = 30000): Promise<boolean> {
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

    /**
     * Retorna status de saúde das dependências
     */
    async getStatus(): Promise<{
        database: boolean;
        extensions: string[];
        migrations: number;
    }> {
        let database = false;
        const extensions: string[] = [];
        let migrations = 0;

        try {
            await this.dataSource.query('SELECT 1');
            database = true;
        } catch { /* ignore */ }

        try {
            const extResult = await this.dataSource.query(
                `SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp')`
            );
            extensions.push(...extResult.map((r: any) => r.extname));
        } catch { /* ignore */ }

        try {
            const migrationResult = await this.dataSource.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = current_schema() 
                  AND table_name = 'startup_optimizer_usage'
            `);
            migrations = parseInt(migrationResult[0]?.count || '0', 10);
        } catch { /* ignore */ }

        return { database, extensions, migrations };
    }
}
