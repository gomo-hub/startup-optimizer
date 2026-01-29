# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
