import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Handles auto-installation of database schema
 */
@Injectable()
export class AutoInstallService implements OnModuleInit {
    private readonly logger = new Logger(AutoInstallService.name);

    constructor(private readonly dataSource: DataSource) { }

    async onModuleInit(): Promise<void> {
        await this.runMigrations();
    }

    private async runMigrations(): Promise<void> {
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

                // Check if already executed (simple approach - production would use tracking table)
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
            } catch (error) {
                this.logger.error(`❌ Migration failed: ${file} - ${error.message}`);
            }
        }
    }

    private extractTableName(sql: string): string | null {
        const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
        return match ? match[1] : null;
    }

    private async tableExists(tableName: string): Promise<boolean> {
        try {
            const result = await this.dataSource.query(
                `SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = $1
                )`,
                [tableName]
            );
            return result[0]?.exists || false;
        } catch {
            return false;
        }
    }
}
