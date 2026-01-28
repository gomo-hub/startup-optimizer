# Instalação do @gomo-hub/startup-optimizer

## Pré-requisitos

- Node.js 20.x LTS
- pnpm 8.x+
- NestJS 10.x ou 11.x
- PostgreSQL (para tracking de uso)

## Instalação

### 1. Adicionar ao package.json

```bash
# Via pnpm
pnpm add git+ssh://git@github-gomo/gomo-hub/startup-optimizer.git#main
```

Ou manualmente no `package.json`:

```json
{
    "dependencies": {
        "@gomo-hub/startup-optimizer": "ssh://git@github-gomo/gomo-hub/startup-optimizer.git#main"
    }
}
```

### 2. Configurar SSH

Certifique-se que `~/.ssh/config` tem o alias `github-gomo`:

```
Host github-gomo
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_gomo
```

### 3. Importar no AppModule

```typescript
import { StartupOptimizerModule } from '@gomo-hub/startup-optimizer';

@Module({
    imports: [
        StartupOptimizerModule.forRoot({
            tiers: {
                instant: [AuthModule, HealthModule],
                essential: [TypeOrmModule],
                background: [PaymentsModule],
                lazy: [VideoComposerModule],
            },
        }),
    ],
})
export class AppModule {}
```

## Verificação

Após iniciar a aplicação, você verá logs como:

```
[StartupOptimizer] 📊 Registered 15 modules: {"INSTANT":2,"ESSENTIAL":3,"BACKGROUND":4,"LAZY":6}
[StartupOptimizer] 🚀 Application bootstrap complete
[StartupOptimizer] 📊 Memory: 150MB / 512MB (29%)
[StartupOptimizer] ✅ Tier ESSENTIAL loaded in 234ms (3 modules)
```

## Atualização

```bash
pnpm update @gomo-hub/startup-optimizer
```

Ou force reinstall:

```bash
rm -rf node_modules/.pnpm/github-gomo+gomo-hub+startup-optimizer*
pnpm install
```
