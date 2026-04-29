-- ============================================================================
-- @gomo-hub/startup-optimizer - Schema Setup
-- Version: 000
-- Description: Creates gomo_hub schema if not exists
-- ============================================================================

-- Create schema for all gomo-hub modules

-- Grant usage to current role
GRANT USAGE ON SCHEMA gomo_hub TO CURRENT_USER;

-- Set as default for this session
SET search_path TO gomo_hub, public;
