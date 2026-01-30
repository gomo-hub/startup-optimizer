import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * 🧠 AI Tier Decision Entity
 * 
 * Stores AI agent decisions about module tier changes
 * - Track what AI decided
 * - When it decided
 * - Why (context/reason)
 * - Outcome (was it effective?)
 */
@Entity({ name: 'startup_optimizer_tier_decisions', schema: 'gomo_hub' })
@Index(['orgId', 'moduleName'])
@Index(['decidedAt'])
export class TierDecision {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Organization/tenant ID (null = global decision) */
    @Column({ name: 'org_id', type: 'uuid', nullable: true })
    @Index()
    orgId?: string;

    /** Module name */
    @Column({ name: 'module_name', type: 'varchar', length: 100 })
    moduleName: string;

    /** Previous tier (INSTANT, ESSENTIAL, BACKGROUND, LAZY, DORMANT) */
    @Column({ name: 'from_tier', type: 'varchar', length: 20, nullable: true })
    fromTier?: string;

    /** New tier after decision */
    @Column({ name: 'to_tier', type: 'varchar', length: 20 })
    toTier: string;

    /** Decision type: PRELOAD, PROMOTE, DEMOTE, OPTIMIZE */
    @Column({ name: 'decision_type', type: 'varchar', length: 20 })
    decisionType: 'PRELOAD' | 'PROMOTE' | 'DEMOTE' | 'OPTIMIZE';

    /** AI agent that made the decision */
    @Column({ name: 'agent_id', type: 'varchar', length: 100, nullable: true })
    agentId?: string;

    /** Reason/context for the decision */
    @Column({ name: 'reason', type: 'text', nullable: true })
    reason?: string;

    /** Confidence score (0-100) */
    @Column({ name: 'confidence', type: 'int', default: 50 })
    confidence: number;

    /** Was the decision effective? (updated after validation) */
    @Column({ name: 'was_effective', type: 'boolean', nullable: true })
    wasEffective?: boolean;

    /** Time to first use after preload (ms) */
    @Column({ name: 'time_to_use_ms', type: 'int', nullable: true })
    timeToUseMs?: number;

    /** When decision was made */
    @CreateDateColumn({ name: 'decided_at' })
    decidedAt: Date;

    /** When outcome was validated */
    @UpdateDateColumn({ name: 'validated_at' })
    validatedAt: Date;
}
