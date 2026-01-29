export declare class TierDecision {
    id: string;
    orgId?: string;
    moduleName: string;
    fromTier?: string;
    toTier: string;
    decisionType: 'PRELOAD' | 'PROMOTE' | 'DEMOTE' | 'OPTIMIZE';
    agentId?: string;
    reason?: string;
    confidence: number;
    wasEffective?: boolean;
    timeToUseMs?: number;
    decidedAt: Date;
    validatedAt: Date;
}
