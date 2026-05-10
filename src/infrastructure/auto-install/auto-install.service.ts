import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DependencyCheckerService } from './dependency-checker.service';
import { MigrationService } from './migration.service';

/**
 * AutoInstallService — @gomo-hub/startup-optimizer
 * 
 * Ponto de entrada para auto-provisionamento do módulo.
 * Padrão Enterprise Híbrido: Dependency Check + Migrations.
 * 
 * Fluxo:
 * 1. Verificar dependências (fail-fast)
 * 2. Executar migrations SQL
 * 3. Verificar integridade
 * 
 * @standard 300.95 - Auto-Install Infrastructure Mandate
 */
@Injectable()
export class AutoInstallService implements OnModuleInit {
    private readonly logger = new Logger(AutoInstallService.name);

    constructor(
        private readonly dependencyChecker: DependencyCheckerService,
        private readonly migrationService: MigrationService,
    ) { }

    async onModuleInit(): Promise<void> {
        if (process.env.GOMO_AUTO_INSTALL === 'false') {
            this.logger?.log?.('GOMO_AUTO_INSTALL=false — skipping auto-install (P2-1)');
            return;
        }
        await this.install();
    }

    /**
     * Executa instalação completa do módulo
     */
    async install(): Promise<void> {
        try {
            this.logger.log('🚀 StartupOptimizer: Iniciando auto-install...');

            // 1. Verificar dependências (fail-fast)
            await this.dependencyChecker.verify();

            // 2. Executar migrations
            await this.migrationService.runMigrations();

            // 3. Verificar integridade
            await this.verifyIntegrity();

            this.logger.log('✅ StartupOptimizer: Auto-install concluído');
        } catch (error) {
            this.logger.error('❌ StartupOptimizer: Erro no auto-install', error);
            throw error;
        }
    }

    /**
     * Verifica integridade pós-instalação
     */
    private async verifyIntegrity(): Promise<void> {
        const status = await this.dependencyChecker.getStatus();

        if (!status.database) {
            throw new Error('StartupOptimizer: Falha na verificação de integridade');
        }

        this.logger.debug(`StartupOptimizer: ${status.migrations} migrations aplicadas`);
    }

    /**
     * Retorna status completo do módulo
     */
    async getStatus(): Promise<{
        installed: boolean;
        database: boolean;
        extensions: string[];
        migrations: number;
    }> {
        const depStatus = await this.dependencyChecker.getStatus();
        return {
            installed: depStatus.database,
            ...depStatus,
        };
    }
}
