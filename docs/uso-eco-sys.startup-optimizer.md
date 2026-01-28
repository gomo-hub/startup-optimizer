# Uso no Ecossistema - Startup Optimizer

Este documento descreve como o `@gomo-hub/startup-optimizer` se integra ao ecossistema GOMO Hub e TrendCash.

## Integração com TrendCash API

### Cenário: 60+ Módulos

O TrendCash API carrega ~60 módulos, causando startup de 30-45s. Com o Startup Optimizer:

```typescript
// apps/trendcash-api/src/app.module.ts
import { StartupOptimizerModule, ModuleTier } from '@gomo-hub/startup-optimizer';

@Module({
    imports: [
        // 🧠 Orchestrator gerencia todos os outros módulos
        StartupOptimizerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                tiers: {
                    // TIER 0: Carrega durante NestFactory.create (~100ms)
                    instant: [
                        ConfigModule,
                        AuthModule,
                        HealthModule,
                    ],
                    
                    // TIER 1: Carrega logo após listen() (~500ms)
                    essential: [
                        TypeOrmModule,
                        BullModule,
                        GomoHubCacheModule,
                    ],
                    
                    // TIER 2: Carrega 2s após listen() (async)
                    background: [
                        GomoHubPaymentsModule,
                        GomoHubCartModule,
                        CheckoutModule,
                    ],
                    
                    // TIER 3: Carrega apenas quando rota é acessada
                    lazy: [
                        VideoComposerModule,
                        VslModule,
                        CalendarModule,
                        AiCloneModule,
                        LiveAvatarModule,
                        CaptionsModule,
                    ],
                    
                    // TIER 4: Features que tenant não usa (nunca carrega)
                    dormant: [
                        CompetitorIntelligenceModule, // Se tenant não tem plano
                    ],
                },
                memoryThreshold: 80,
                backgroundDelay: 2000,
                debug: config.get('NODE_ENV') === 'development',
            }),
        }),
        
        // Outros módulos que não são gerenciados pelo Optimizer
        // (geralmente services auxiliares)
    ],
})
export class AppModule {}
```

### Resultado Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Startup Total | 30-45s | **< 5s** |
| RAM no Boot | 800MB | **< 200MB** |
| Time to First Request | 30s+ | **< 3s** |

## Integração com GOMO Hub API

O GOMO Hub API é menor (~15 módulos), mas ainda se beneficia:

```typescript
// apps/gomo-hub-api/src/app.module.ts
StartupOptimizerModule.forRoot({
    tiers: {
        instant: [ConfigModule, HealthModule],
        essential: [DatabaseModule, IdentityModule],
        background: [AnalyticsModule, CatalogModule],
        lazy: [TrendsModule],
    },
}),
```

## Uso com Outros Módulos @gomo-hub

### Dependência entre Módulos

Se um módulo @gomo-hub depende de outro:

```typescript
// No tierManager, definir dependências
tierManager.register({
    name: 'CheckoutModule',
    module: CheckoutModule,
    tier: ModuleTier.BACKGROUND,
    dependencies: ['PaymentsModule', 'CartModule'], // Carrega após esses
});
```

### Lazy Loading com Rotas

Para módulos LAZY, especificar rotas que os ativam:

```typescript
tierManager.register({
    name: 'VideoComposerModule',
    module: VideoComposerModule,
    tier: ModuleTier.LAZY,
    routes: ['/api/videos', '/api/composer'],
});
```

## Multi-Tenant

O Startup Optimizer suporta personalização por tenant:

```typescript
// Futuro: Demand Prediction
// Analisa quais módulos cada org mais usa
// Promove módulos frequentes para tiers mais altos
orchestrator.promoteTier('VideoComposerModule'); // LAZY → BACKGROUND
orchestrator.demoteTier('CalendarModule');       // BACKGROUND → LAZY
```

## Métricas e Monitoramento

```typescript
// Obter estatísticas
const stats = orchestrator.getStats();
console.log(stats);
// {
//   modules: { total: 15, loaded: 8, byTier: {...} },
//   resources: { memoryUsagePercent: 45, heapUsedMB: 230 },
//   bootstrapComplete: true
// }
```
