# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-01-29

### Added - Phase 4: Persistence Layer
- `TierDecision` entity - Tracks AI tier decisions with reason, confidence, effectiveness
- `UsagePattern` entity - Stores aggregated usage patterns for AI learning
- `PersistenceService` - Database operations for usage tracking and AI feedback loops
- `StartupOptimizerAdminController` - REST API for admin dashboard
- `OptimizerSchedulerService` - Native timer-based cron jobs (no external dependencies)

### AI Learning Features
- `recordDecision()` - Stores AI tier decisions with reason and confidence
- `validateDecision()` - Validates if decisions were effective
- `getDecisionEffectiveness()` - Returns hit rate and effectiveness metrics
- `classifyModules()` - Classifies modules as HOT/WARM/COLD based on usage
- `getHotModulesAtHour()` - Gets modules frequently accessed at specific hours
- `getSequencePatterns()` - Returns module access sequences for preload prediction

### Admin Dashboard Endpoints
- `GET /admin/startup-optimizer/dashboard` - Full dashboard data
- `GET /admin/startup-optimizer/health` - System health and resources
- `GET /admin/startup-optimizer/modules` - All module statuses
- `GET /admin/startup-optimizer/tiers` - Tier distribution
- `GET /admin/startup-optimizer/ai/decisions` - AI decision history
- `GET /admin/startup-optimizer/patterns` - Usage patterns
- `POST /admin/startup-optimizer/actions/preload` - Manual preload
- `POST /admin/startup-optimizer/actions/promote` - Manual promotion

### TierOptimizerTool Enhancements
- Added `get_effectiveness` action for AI effectiveness stats
- Added `reason` and `confidence` parameters for learning
- Integrated with PersistenceService for automatic decision recording

### Scheduled Tasks
- Hourly module classification (HOT/WARM/COLD)
- 6-hourly pattern analysis and auto-preload
- 15-minute decision validation
- Daily data cleanup (30-day retention)

## [1.1.0] - 2026-01-29

### Added
- Dynamic memory management based on free system RAM
- `getSystemMemory()` - Returns system-level memory info (total/free/used)
- `calculateDynamicThreshold()` - Auto-adjusts threshold based on available RAM
- `canLoadModuleDynamic()` - Resource check using dynamic threshold
- `SystemMemoryInfo` interface for system memory tracking

### Changed
- BACKGROUND/LAZY modules now defer based on system RAM, not fixed 80% heap threshold
- Aggressive loading (95%) when free RAM > 500MB
- Conservative loading (70%) when free RAM < 200MB

### Fixed
- Handle modules already loaded synchronously via `imports[]` array


## [1.0.0] - 2026-01-28

### Added
- Initial release of Progressive Module Architecture (PMA)
- `StartupOptimizerModule` with `forRoot()` and `forRootAsync()`
- `ModuleOrchestratorService` - Central brain for module loading decisions
- `TierManagerService` - Module registry with tier management
- `ResourceMonitorService` - Memory/CPU monitoring
- 5-tier loading system: INSTANT, ESSENTIAL, BACKGROUND, LAZY, DORMANT
- SQL migration for usage tracking (`startup_optimizer_usage`)
- Auto-install infrastructure following @gomo-hub patterns
