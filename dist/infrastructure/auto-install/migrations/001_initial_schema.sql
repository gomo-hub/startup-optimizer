-- ============================================================================
-- @gomo-hub/startup-optimizer - Initial Schema
-- Version: 001
-- Description: Creates module usage tracking table for demand prediction
-- ============================================================================

-- Set correct schema for TypeORM compatibility
SET search_path TO gomo_hub, public;


-- Tracking table for module usage per tenant
CREATE TABLE IF NOT EXISTS startup_optimizer_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    route VARCHAR(255),
    load_time_ms INT,
    accessed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_startup_optimizer_usage_org_module 
    ON startup_optimizer_usage(org_id, module_name);

CREATE INDEX IF NOT EXISTS idx_startup_optimizer_usage_org_accessed 
    ON startup_optimizer_usage(org_id, accessed_at);

CREATE INDEX IF NOT EXISTS idx_startup_optimizer_usage_accessed 
    ON startup_optimizer_usage(accessed_at);

-- Comment on table
COMMENT ON TABLE startup_optimizer_usage IS 'Tracks module usage per tenant for demand prediction in PMA';
