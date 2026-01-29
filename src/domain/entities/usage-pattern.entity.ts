import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * 📊 Usage Pattern Entity
 * 
 * Stores aggregated usage patterns for AI analysis
 * - Module access frequencies by hour
 * - Sequence patterns (A → B)
 * - Hot/cold module classification
 */
@Entity('startup_optimizer_patterns')
@Index(['orgId', 'moduleName'])
@Index(['patternType'])
export class UsagePattern {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Organization/tenant ID (null = global pattern) */
    @Column({ name: 'org_id', type: 'uuid', nullable: true })
    @Index()
    orgId?: string;

    /** Module name */
    @Column({ name: 'module_name', type: 'varchar', length: 100 })
    moduleName: string;

    /** Pattern type: HOURLY, SEQUENCE, CLASSIFICATION */
    @Column({ name: 'pattern_type', type: 'varchar', length: 20 })
    patternType: 'HOURLY' | 'SEQUENCE' | 'CLASSIFICATION';

    /** Hour of day (0-23) for HOURLY patterns */
    @Column({ name: 'hour', type: 'int', nullable: true })
    hour?: number;

    /** Related module for SEQUENCE patterns */
    @Column({ name: 'related_module', type: 'varchar', length: 100, nullable: true })
    relatedModule?: string;

    /** Count/frequency */
    @Column({ name: 'count', type: 'int', default: 0 })
    count: number;

    /** Average response time (ms) */
    @Column({ name: 'avg_response_time_ms', type: 'int', nullable: true })
    avgResponseTimeMs?: number;

    /** Confidence/weight (0-100) */
    @Column({ name: 'confidence', type: 'int', default: 50 })
    confidence: number;

    /** Classification: HOT, WARM, COLD */
    @Column({ name: 'classification', type: 'varchar', length: 10, nullable: true })
    classification?: 'HOT' | 'WARM' | 'COLD';

    /** Period start (for aggregation window) */
    @Column({ name: 'period_start', type: 'timestamptz', nullable: true })
    periodStart?: Date;

    /** Period end */
    @Column({ name: 'period_end', type: 'timestamptz', nullable: true })
    periodEnd?: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
