export declare class UsagePattern {
    id: string;
    orgId?: string;
    moduleName: string;
    patternType: 'HOURLY' | 'SEQUENCE' | 'CLASSIFICATION';
    hour?: number;
    relatedModule?: string;
    count: number;
    avgResponseTimeMs?: number;
    confidence: number;
    classification?: 'HOT' | 'WARM' | 'COLD';
    periodStart?: Date;
    periodEnd?: Date;
    createdAt: Date;
    updatedAt: Date;
}
