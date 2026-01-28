# @gomo-hub/startup-optimizer

> Progressive Module Architecture (PMA) for NestJS - Optimize startup time with tiered module loading

## 🚀 Features

- **Tiered Loading**: INSTANT → ESSENTIAL → BACKGROUND → LAZY → DORMANT
- **Resource Monitoring**: Defer loading when memory threshold exceeded
- **Demand Prediction**: Learn which modules tenants use most (future)
- **Self-Healing**: Graceful degradation when modules fail

## 📦 Installation

```bash
# In your consumer project (e.g., trendcash-api)
pnpm add git+ssh://git@github-gomo/gomo-hub/startup-optimizer.git#main
```

## 🔧 Usage

### Basic Setup

```typescript
import { StartupOptimizerModule, ModuleTier } from '@gomo-hub/startup-optimizer';

@Module({
    imports: [
        StartupOptimizerModule.forRoot({
            tiers: {
                instant: [AuthModule, HealthModule],
                essential: [TypeOrmModule, BullModule],
                background: [PaymentsModule, CartModule],
                lazy: [VideoComposerModule, VslModule],
            },
            memoryThreshold: 80,     // Defer if memory > 80%
            backgroundDelay: 2000,   // Load BACKGROUND after 2s
            debug: true,
        }),
    ],
})
export class AppModule {}
```

### Async Configuration

```typescript
StartupOptimizerModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
        tiers: { ... },
        debug: config.get('NODE_ENV') === 'development',
    }),
}),
```

### Accessing Services

```typescript
import { ModuleOrchestratorService } from '@gomo-hub/startup-optimizer';

@Injectable()
export class MyService {
    constructor(private orchestrator: ModuleOrchestratorService) {}
    
    async ensureVideoModule() {
        await this.orchestrator.ensureLoaded('VideoComposerModule');
    }
}
```

## 📊 Module Tiers

| Tier | When Loaded | Use Case |
|------|-------------|----------|
| INSTANT | During bootstrap | Auth, Config, Health |
| ESSENTIAL | After listen() | Database, Cache |
| BACKGROUND | 2s after listen() | Payments, Cart |
| LAZY | On first request | VideoComposer, VSL |
| DORMANT | Never (unless requested) | Unused features |

## 🏗️ Architecture

```
src/
├── domain/
│   ├── entities/           # ModuleUsage (tracking)
│   └── interfaces/         # ModuleTier, Options
├── application/
│   └── services/
│       ├── module-orchestrator.service.ts  # 🧠 Brain
│       ├── tier-manager.service.ts         # Registry
│       └── resource-monitor.service.ts     # Memory check
├── infrastructure/
│   └── auto-install/       # SQL migrations
└── startup-optimizer.module.ts
```

## 📄 License

MIT
