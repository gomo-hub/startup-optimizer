# API Reference - @gomo-hub/startup-optimizer

## Módulo

### StartupOptimizerModule

O módulo principal que deve ser importado no AppModule.

#### forRoot(options)

Configuração estática.

```typescript
StartupOptimizerModule.forRoot({
    tiers: {
        instant: [AuthModule],
        essential: [DatabaseModule],
        background: [PaymentsModule],
        lazy: [VideoModule],
        dormant: [],
    },
    memoryThreshold: 80,
    backgroundDelay: 2000,
    debug: false,
})
```

#### forRootAsync(asyncOptions)

Configuração assíncrona (recomendado).

```typescript
StartupOptimizerModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
        tiers: { ... },
        debug: config.get('NODE_ENV') === 'development',
    }),
})
```

---

## Enums

### ModuleTier

```typescript
enum ModuleTier {
    INSTANT = 0,     // Durante bootstrap
    ESSENTIAL = 1,   // Após listen()
    BACKGROUND = 2,  // 2s após listen()
    LAZY = 3,        // Sob demanda
    DORMANT = 4,     // Nunca (a menos que solicitado)
}
```

---

## Interfaces

### StartupOptimizerOptions

```typescript
interface StartupOptimizerOptions {
    tiers?: {
        instant?: any[];
        essential?: any[];
        background?: any[];
        lazy?: any[];
        dormant?: any[];
    };
    enableDemandPrediction?: boolean;
    resourceMonitoring?: boolean;
    memoryThreshold?: number;      // Padrão: 80
    backgroundDelay?: number;      // Padrão: 2000ms
    debug?: boolean;               // Padrão: false
    schema?: string;               // Schema do banco
}
```

### ModuleRegistration

```typescript
interface ModuleRegistration {
    module: any;
    tier: ModuleTier;
    name: string;
    dependencies?: string[];
    routes?: string[];
    loaded?: boolean;
    loadedAt?: Date;
}
```

### ResourceSnapshot

```typescript
interface ResourceSnapshot {
    memoryUsagePercent: number;
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
    timestamp: Date;
}
```

---

## Services

### ModuleOrchestratorService

O serviço principal ("cérebro") que orquestra o carregamento.

#### Métodos

| Método | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `loadTier` | `tier: ModuleTier` | `Promise<void>` | Carrega todos os módulos de um tier |
| `loadModule` | `registration: ModuleRegistration` | `Promise<boolean>` | Carrega um módulo específico |
| `ensureLoaded` | `moduleName: string` | `Promise<boolean>` | Garante que módulo está carregado |
| `ensureLoadedForRoute` | `route: string` | `Promise<boolean>` | Carrega módulo associado à rota |
| `getStats` | — | `object` | Retorna estatísticas |

#### Exemplo

```typescript
@Injectable()
export class VideoService {
    constructor(private orchestrator: ModuleOrchestratorService) {}
    
    async render() {
        await this.orchestrator.ensureLoaded('VideoComposerModule');
        // Agora o módulo está disponível
    }
}
```

---

### TierManagerService

Gerencia o registro e status dos módulos.

#### Métodos

| Método | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `register` | `registration: ModuleRegistration` | `void` | Registra um módulo |
| `getModulesByTier` | `tier: ModuleTier` | `ModuleRegistration[]` | Lista módulos do tier |
| `getModule` | `name: string` | `ModuleRegistration` | Busca módulo por nome |
| `getModuleByRoute` | `route: string` | `ModuleRegistration` | Busca módulo por rota |
| `markLoaded` | `name: string` | `void` | Marca como carregado |
| `isLoaded` | `name: string` | `boolean` | Verifica se está carregado |
| `promoteTier` | `name: string` | `void` | Promove para tier mais alto |
| `demoteTier` | `name: string` | `void` | Demove para tier mais baixo |
| `getStats` | — | `object` | Estatísticas de registro |

---

### ResourceMonitorService

Monitora recursos do sistema.

#### Métodos

| Método | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `getCurrentUsage` | — | `ResourceSnapshot` | Uso atual de recursos |
| `canLoadModule` | `threshold?: number` | `boolean` | Verifica se pode carregar |
| `getAverageUsage` | `lastN?: number` | `number` | Média de uso |
| `getMemoryTrend` | — | `string` | Tendência: increasing/stable/decreasing |
| `logStatus` | — | `void` | Loga status atual |

---

## Entities

### ModuleUsage

Tabela para tracking de uso (para demand prediction).

```typescript
@Entity('startup_optimizer_usage')
class ModuleUsage {
    id: string;           // UUID
    orgId: string;        // Tenant ID
    moduleName: string;   // Nome do módulo
    route?: string;       // Rota que ativou
    loadTimeMs?: number;  // Tempo de carga
    accessedAt: Date;     // Timestamp
}
```
