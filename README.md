# Notfeed

> Seu leitor de feeds pessoal. Offline-first, multi-protocolo, sem servidor.

Cole uma URL de RSS, importe um `.notfeed.json` curado por outra pessoa, ou siga uma chave Nostr — tudo cai numa **timeline unificada** que você organiza com categorias, prioridades, favoritos e macros salvas. Os dados ficam no seu dispositivo. Funciona instalado como PWA, como AppImage no Linux, ou aberto direto no navegador.

```
┌──────────┐   ┌──────────┐     ┌──────────┐     ┌──────────┐
│   RSS    │   │   Atom   │     │JSON Feed │     │  Nostr   │
└────┬─────┘   └────┬─────┘     └────┬─────┘     └────┬─────┘
     └──────────────┴────────┬───────┴────────────────┘
                             ▼
                   ┌──────────────────┐
                   │   Normalização   │  → IngestedPost canônico
                   └────────┬─────────┘
                            ▼
                   ┌──────────────────┐
                   │   Sua timeline   │  filtros · prioridades · favoritos
                   └──────────────────┘
```

---

## O que ele faz

### 📡 Quatro protocolos, uma timeline

Independente de onde o conteúdo vem, você vê tudo no mesmo formato. Os quatro protocolos suportados:

- **RSS 2.0** — o formato XML clássico da web aberta. Quase todo blog, podcast e portal de notícias publica um. Você dá uma URL (`https://exemplo.com/feed.xml`) e o app baixa periodicamente a lista de itens.
- **Atom 1.0** — primo mais novo do RSS, também XML. Mesmo modelo (URL → lista de itens), com schema mais rigoroso. Comum em blogs hospedados (GitHub Pages, Blogger).
- **JSON Feed 1.0/1.1** — alternativa moderna ao RSS/Atom, em JSON em vez de XML. Cresceu com newsletters e ferramentas indie. Mesma ideia: URL pública, lista de itens.
- **Nostr** — protocolo descentralizado baseado em **chaves públicas e relays** (servidores WebSocket). Em vez de uma URL, você segue uma `pubkey` (ex.: `npub1…`) em alguns relays (`wss://relay.damus.io`). O app abre um `REQ` pedindo os eventos daquele autor e recebe em tempo real.

> **Os três primeiros são "puxar" (cliente faz GET periódico).** Nostr é "assinar" (WebSocket aberto). O `PostManager` esconde isso e entrega tudo como `IngestedPost` canônico.

**Auto-detecção na importação por URL:**

| Padrão na URL                                        | Detectado como |
| ---------------------------------------------------- | -------------- |
| termina em `.json`, contém `feed.json` ou `jsonfeed` | JSON Feed      |
| contém `atom`, `.xml`, `/feed` ou `rss`              | RSS / Atom     |
| `npub1…` ou string hex de 64 chars                   | Nostr (pubkey) |

**Eficiência de rede:** RSS, Atom e JSON Feed usam _conditional GET_ — o app envia `If-None-Match` (ETag) e `If-Modified-Since`; se nada mudou, o servidor responde **304 Not Modified** sem corpo. Nostr é stream, então só recebe eventos novos após o `EOSE` inicial.

### 🗂️ Organize do seu jeito

- **ContentTrees** — a unidade básica de curadoria. Uma ContentTree é uma árvore com um ou mais **perfis** (canais, autores) e as **fontes** de cada perfil. Você importa trees prontas (`.notfeed.json`) de outras pessoas, ou monta a sua do zero como Creator. Na prática: "Tech Brasil" pode ser uma tree com o perfil do usuário (Nostr) + o feed do blog dele (RSS) + o canal do YouTube (Atom).
- **Categorias** — cada tree/perfil/fonte pode ter categorias em 5 eixos: assunto, tipo de conteúdo, formato de mídia, região e idioma. No feed, você filtra por qualquer combinação com modo _qualquer um_ (relaxado) ou _todos obrigatórios_ (estrito).
- **Prioridades** — dois níveis (alta / normal) que você define por fonte, por perfil ou por tree inteira. Fontes de alta prioridade aparecem mais cedo na timeline; o número especifica proporção, não só ordem.
- **Macros** — um atalho de filtro salvo. Em vez de reajustar os filtros toda vez, você cria uma macro "Tech EN-US, só text posts, modo any" e chama com um clique. As macros também são a base para o sistema de notificações.

### 👥 Multi-usuário no mesmo dispositivo

Schema **per-user**: dois usuários no mesmo navegador têm caixas de leitura totalmente separadas. Marcar como lido em uma conta não vaza pra outra.

Há dois papéis:

- **Consumer** — quem lê (Acesso a area de consumo: Feed, Browse e Library)
- **Creator** — quem publica trees (Acesso a area de edição: Pages e Preview)

### 🔔 Notificações em três níveis de ruído

Você não configura regras complexas — você escolhe **o quão barulhento** cada macro deve ser. Toda macro pode ficar em um destes três modos:

1. **per_post** — _"me avise de cada post"_. Cada item novo vira uma notificação do sistema operacional individual. Bom para fontes raras e importantes.
2. **batch_macro** — _"me dê um resumo dessa macro"_. Acumula os posts novos da macro e dispara uma única notificação agregada ("5 novos em Tech BR"). Bom para fontes ativas.
3. **batch_global** — _"me chame uma vez só"_. Junta tudo de tudo em uma notificação diária. Ruído mínimo.

Independente do modo, todo post novo entra na **inbox in-app** (ninguém fica para trás). A notificação do SO é best-effort: se você não deu permissão, o app não reclama. Clicar abre o post (modo per_post) ou a timeline filtrada pela macro (modos batch).

### 🌐 Funciona offline

- IndexedDB como backend (abstraído atrás de `StorageBackend`)
- Service Worker pré-cacheia assets e serve SPA fallback
- Export `.notfeed.json` pra mover trees entre dispositivos

### ⏱️ Ingestão que respeita rede e bateria

- **Tiers de ociosidade** — você define em quanto tempo a fonte deve ser checada quando o app está ativo, e três níveis decrescentes para quando você não abre o app há horas/dias. Fonte que ninguém olha há uma semana é checada uma vez por dia, não a cada 5 minutos.
- **Coalescência** — se dois usuários do mesmo dispositivo seguem a mesma fonte, o app faz **uma única** requisição e distribui o resultado para ambas as caixas. Não multiplica tráfego pelo número de contas.
- **Backoff exponencial** — se uma fonte começa a falhar, o intervalo entre tentativas dobra até um teto (24h por padrão). Não martela servidor offline.
- **Mesma lógica em foreground e Service Worker** — o módulo `PostManager` roda igual com o app aberto ou fechado em background, então não existe "versão do SW" desatualizada.

---

## Começando

Use Node 24.22.3 (`.nvmrc`) e pnpm 11.28.12 (`packageManager`). Com nvm: `nvm install && nvm use`. Se o gerenciador ainda não estiver disponível, instale-o uma vez com `npm install --global pnpm@11.28.12`; as dependências do projeto usam pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abra <http://localhost:5173>, crie um Consumer em `/user`, vá em `/browse/import` e cole uma URL de feed. Ou pegue um `.notfeed.json` qualquer e arraste pra mesma página.

### Estrutura do repositório

```text
apps/web/                  @notfeed/web: rotas, layout, CSS, static e service worker
apps/desktop/src-tauri/     @notfeed/desktop: aplicativo Tauri e crate Rust existentes
packages/notfeed/src/      @notfeed/product: código atual de lib e seus agrupamentos
tooling/checks/            verificações permanentes e utilidades
tooling/maintenance/       contratos e gates da base técnica
tooling/migration/         provas históricas da etapa 1
tooling/e2e/               Chromium, fixtures locais e provas de atualização PWA
```

A raiz coordena os três workspaces por `pnpm-workspace.yaml`, com `pnpm-lock.yaml` único para JS/TS. Cargo mantém seu lock próprio. A web importa `@notfeed/product` por subpaths; o pacote conserva as dependências de Svelte/SvelteKit já usadas pelo produto. O desktop empacota `apps/web/build`. A definição dos módulos de negócio pertence à etapa 3. Pacotes futuros Rust/C++ poderão ter manifests próprios quando houver um consumidor concreto.

O `tsconfig.json` da raiz permite ao editor descobrir o projeto ao abrir arquivos do pacote; ele estende a configuração da web, que inclui toda a árvore do produto. Não há alias para a localização anterior.

O [estado da migração](docs/plans/etapa-1-migracao-estrutural/state.md) registra gates, checkpoints e limites de cobertura.

### Primeiro feed em 30 segundos

1. `/user` → criar usuário consumer
2. `/browse/import` → aba **URLs**, colar `https://hnrss.org/frontpage` → Importar
3. `/library` → ativar o nó da fonte
4. `/` → primeiro tick traz os posts (ou aperte refresh manual)

---

## Run targets

### 🌐 Web / PWA

```sh
pnpm build
pnpm preview   # http://localhost:4173 com SW ativo
```

O deploy estático usa somente o conteúdo de `apps/web/build`.

Em produção, o navegador detecta `manifest.webmanifest` + service worker e oferece **"Instalar app"**. Depois de instalado, abre offline (assets pré-cacheados, SPA fallback).

### 🖥️ Tauri — AppImage Linux

Pré-requisitos de sistema (GTK, WebKit2GTK, libfuse2 em runtime): veja [docs/build-targets.md](docs/build-targets.md).

O desktop usa Rust 1.100.0, fixado em `rust-toolchain.toml`, com rustfmt e Clippy. Instale com `rustup toolchain install 1.100.0 --profile minimal --component rustfmt --component clippy`; o arquivo seleciona a versão no repositório sem mudar o default global. O mínimo declarado do crate é Rust 1.95, validado no alvo Linux com o lock atual. Para a auditoria, use `cargo install cargo-audit --version 0.23.0 --locked`.

```sh
pnpm tauri:dev          # janela nativa com HMR
pnpm tauri:appimage     # → apps/desktop/src-tauri/target/release/bundle/appimage/Notfeed_<version>_amd64.AppImage
```

Em runtime Tauri:

- Service Worker **não** é registrado (gating em `+layout.svelte`)
- Fetches usam `tauri-plugin-http` (sem CORS proxy)
- Notificações via `tauri-plugin-notification`
- IndexedDB do WebKit2GTK é a persistência atual; SQLite via `tauri-plugin-sql` está reservado para Plano C

Outros bundles (`.deb`, `.rpm`, `.msi`, `.dmg`, Android TWA) ficam para iterações futuras.

---

## Stack

| Camada       | Escolha                                                       |
| ------------ | ------------------------------------------------------------- |
| Framework    | **SvelteKit** (SPA, `adapter-static`)                         |
| UI           | **Svelte 5** runes + **Tailwind 4** + bits-ui (shadcn-svelte) |
| Linguagem    | **TypeScript** estrito (svelte-check 0/0/0)                   |
| Persistência | **IndexedDB** atrás de `StorageBackend`                       |
| Desktop      | **Tauri 2** (plugins http, shell, notification)               |
| Testes       | **vitest** + jsdom + @testing-library/svelte                  |
| Ícones       | **Lucide** (`@lucide/svelte`)                                 |
| i18n         | sistema próprio reativo (en-US, pt-BR)                        |

---

## Scripts

Veja [ambiente de desenvolvimento](docs/development.md) para setup por alvo, versões fixadas e diagnóstico. Use `pnpm verify:quick` na rotina web e `pnpm verify:integration` para a integração PWA/AppImage completa. `pnpm pwa:preview` faz build e preview com SW; watch e lote de testes compartilham UTC/en-US.

| Comando                                | O que faz                                                                |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm dev`                             | Servidor de desenvolvimento (Vite + HMR)                                 |
| `pnpm build`                           | Build de produção (emite `service-worker.js` e `manifest.webmanifest`)   |
| `pnpm preview`                         | Preview do build com SW ativo                                            |
| `pnpm check`                           | Tipos Svelte/TS e worker separado                                        |
| `pnpm test`                            | Testes em watch mode                                                     |
| `pnpm test:run`                        | Testes em batch (CI)                                                     |
| `pnpm check:e2e`                       | Tipos da infraestrutura de navegador                                     |
| `pnpm test:e2e --project=chromium`     | Fluxos web/PWA contra o build de produção                                |
| `pnpm test:e2e:dev --project=chromium` | Navegador real contra o servidor de desenvolvimento                      |
| `pnpm test:e2e:upgrade`                | Reconstrói a entrada da etapa 2 e verifica atualização preservando dados |
| `pnpm icons:gen`                       | Regenera ícones PWA a partir de `apps/web/static/icons/source.svg`       |
| `pnpm tauri:dev`                       | Tauri em modo dev (janela nativa + HMR)                                  |
| `pnpm tauri:appimage`                  | Bundle AppImage Linux x86_64                                             |

Antes dos testes de navegador, instale o Chromium correspondente ao Playwright fixado:

```sh
pnpm exec playwright install chromium
pnpm build
pnpm test:e2e --project=chromium
```

Os testes usam dados sintéticos em servidor local e `.artifacts`. A prova de atualização reconstrói a entrada da etapa 2 pelo bundle Git autossuficiente e pela receita em `tooling/e2e/reference/stage-2-entry.json`, com o Node/npm histórico provisionado em isolamento. Os comprovantes P0–P6 permanecem históricos. O gate nativo verifica compilação, testes Rust disponíveis e conteúdo do AppImage; não é E2E da WebView ou das notificações do sistema.

---

## Mapa de rotas

### Consumer

| Rota                 | O que tem ali                                                       |
| -------------------- | ------------------------------------------------------------------- |
| `/`                  | Feed — timeline com filtros, macros, entity filter, category filter |
| `/browse`            | Navegação pelas árvores disponíveis (busca + filtros)               |
| `/browse/import`     | Importar `.notfeed.json` ou URLs simples                            |
| `/browse/node/[id]`  | Detalhe de qualquer nó (perfil, fonte, coleção…)                    |
| `/library`           | Suas ativações organizadas em tabs (📚 All, ⭐ Favorites, custom)   |
| `/library/node/[id]` | Detalhe de nó na library                                            |
| `/user`              | Multi-conta, troca de identidade, settings, ingestion tiers         |

### Creator

| Rota                              | O que tem ali                           |
| --------------------------------- | --------------------------------------- |
| `/pages`                          | Lista de ContentTrees do creator        |
| `/pages/new` · `/pages/[id]`      | Editor de árvore (CRUD de nós e seções) |
| `/preview` · `/preview/node/[id]` | Preview do snapshot publicado           |

### Layout adaptativo

- ≥ 900px → sidebar fixa de 295px + main scrollável
- < 900px → bottom nav de 56px (mobile-first)

---

## Documentação

A pasta [docs/](docs/) é a fonte da verdade técnica:

- [overview.md](docs/requirements/overview.md) — visão geral, escopo implementado, princípios
- [architecture.md](docs/architecture.md) — ADRs (decisões arquiteturais numeradas)
- [ingestion-pipeline.md](docs/ingestion-pipeline.md) — máquina de estados de ingestão (HEALTHY/UNSTABLE/OFFLINE/RECOVERING) e disjuntor por origem
- [notification-system.md](docs/notification-system.md) — os dois canais (posts + eventos de pipeline) e o consumidor
- [glossary.md](docs/glossary.md) — vocabulário do domínio
- [requirements/](docs/requirements/) — fonts, content-trees, ingestion, profiles, categories, persistence, users, platforms
- [build-targets.md](docs/build-targets.md) — pré-requisitos por plataforma
- [steps/](docs/steps/) — roadmap por fase

---

## Licença

MIT — veja [LICENSE-MIT.md](LICENSE-MIT.md).
