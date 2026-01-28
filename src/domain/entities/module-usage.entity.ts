import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Tracks module usage per tenant for demand prediction
 */
@Entity('startup_optimizer_usage')
@Index(['orgId', 'moduleName'])
@Index(['orgId', 'accessedAt'])
export class ModuleUsage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Organization/tenant ID */
    @Column({ name: 'org_id', type: 'uuid' })
    @Index()
    orgId: string;

    /** Module name (e.g., 'VideoComposer', 'Calendar') */
    @Column({ name: 'module_name', type: 'varchar', length: 100 })
    moduleName: string;

    /** Route that triggered the load */
    @Column({ name: 'route', type: 'varchar', length: 255, nullable: true })
    route?: string;

    /** Load time in milliseconds */
    @Column({ name: 'load_time_ms', type: 'int', nullable: true })
    loadTimeMs?: number;

    /** Accessed timestamp */
    @CreateDateColumn({ name: 'accessed_at' })
    accessedAt: Date;
}
