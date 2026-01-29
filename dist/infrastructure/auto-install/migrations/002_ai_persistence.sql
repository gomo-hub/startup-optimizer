-- ============================================================================
-- @gomo-hub/startup-optimizer - Phase 4: AI Persistence
-- Version: 002
-- Description: Creates tables for AI tier decisions and usage patterns
-- ============================================================================

-- Set correct schema for TypeORM compatibility
SET search_path TO gomo_hub, public;


-- ============================================================
-- AI TIER DECISIONS TABLE
-- Stores AI agent decisions about module tier changes
-- ============================================================
CREATE TABLE IF NOT EXISTS startup_optimizer_tier_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID,
    module_name VARCHAR(100) NOT NULL,
    from_tier VARCHAR(20),
    to_tier VARCHAR(20) NOT NULL,
    decision_type VARCHAR(20) NOT NULL,
    agent_id VARCHAR(100),
    reason TEXT,
    confidence INT DEFAULT 50,
    was_effective BOOLEAN,
    time_to_use_ms INT,
    decided_at TIMESTAMP DEFAULT NOW(),
    validated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for tier decisions
CREATE INDEX IF NOT EXISTS idx_tier_decisions_org_module 
    ON startup_optimizer_tier_decisions(org_id, module_name);

CREATE INDEX IF NOT EXISTS idx_tier_decisions_decided_at 
    ON startup_optimizer_tier_decisions(decided_at);

CREATE INDEX IF NOT EXISTS idx_tier_decisions_type 
    ON startup_optimizer_tier_decisions(decision_type);

COMMENT ON TABLE startup_optimizer_tier_decisions IS 'AI agent tier decisions for learning feedback loop';

-- ============================================================
-- USAGE PATTERNS TABLE
-- Stores aggregated usage patterns for AI analysis
-- ============================================================
CREATE TABLE IF NOT EXISTS startup_optimizer_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID,
    module_name VARCHAR(100) NOT NULL,
    pattern_type VARCHAR(20) NOT NULL,
    hour INT,
    related_module VARCHAR(100),
    count INT DEFAULT 0,
    avg_response_time_ms INT,
    confidence INT DEFAULT 50,
    classification VARCHAR(10),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for usage patterns
CREATE INDEX IF NOT EXISTS idx_patterns_org_module 
    ON startup_optimizer_patterns(org_id, module_name);

CREATE INDEX IF NOT EXISTS idx_patterns_type 
    ON startup_optimizer_patterns(pattern_type);

CREATE INDEX IF NOT EXISTS idx_patterns_classification 
    ON startup_optimizer_patterns(classification);

COMMENT ON TABLE startup_optimizer_patterns IS 'Aggregated usage patterns for AI module optimization';
