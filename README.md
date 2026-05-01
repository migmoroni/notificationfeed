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

| Padrão na URL | Detectado como |
|---|---|
| termina em `.json`, contém `feed.json` ou `jsonfeed` | JSON Feed |
| contém `atom`, `.xml`, `/feed` ou `rss` | RSS / Atom |
| `npub1…` ou string hex de 64 chars | Nostr (pubkey) |

**Eficiência de rede:** RSS, Atom e JSON Feed usam *conditional GET* — o app envia `If-None-Match` (ETag) e `If-Modified-Since`; se nada mudou, o servidor responde **304 Not Modified** sem corpo. Nostr é stream, então só recebe eventos novos após o `EOSE` inicial.

### 🗂️ Organize do seu jeito

- **ContentTrees** — a unidade básica de curadoria. Uma ContentTree é uma árvore com um ou mais **perfis** (canais, autores) e as **fontes** de cada perfil. Você importa trees prontas (`.notfeed.json`) de outras pessoas, ou monta a sua do zero como Creator. Na prática: "Tech Brasil" pode ser uma tree com o perfil do usuário (Nostr) + o feed do blog dele (RSS) + o canal do YouTube (Atom).
- **Categorias** — cada tree/perfil/fonte pode ter categorias em 5 eixos: assunto, tipo de conteúdo, formato de mídia, região e idioma. No feed, você filtra por qualquer combinação com modo *qualquer um* (relaxado) ou *todos obrigatórios* (estrito).
- **Prioridades** — dois níveis (alta / normal) que você define por fonte, por perfil ou por tree inteira. Fontes de alta prioridade aparecem mais cedo na timeline; o número especifica proporção, não só ordem.
- **Macros** — um atalho de filtro salvo. Em vez de reajustar os filtros toda vez, você cria uma macro "Tech EN-US, só text posts, modo any" e chama com um clique. As macros também são a base para o sistema de notificações.

### 👥 Multi-usuário no mesmo dispositivo
Schema **per-user**: dois usuários no mesmo navegador têm caixas de leitura totalmente separadas. Marcar como lido em uma conta não vaza pra outra.

Há dois papéis:
- **Consumer** — quem lê (Acesso a area de consumo: Feed, Browse e Library)
- **Creator** — quem publica trees (Acesso a area de edição: Pages e Preview)

### 🔔 Notificações em três níveis de ruído

Você não configura regras complexas — você escolhe **o quão barulhento** cada macro deve ser. Toda macro pode ficar em um destes três modos:

1. **per_post** — *"me avise de cada post"*. Cada item novo vira uma notificação do sistema operacional individual. Bom para fontes raras e importantes.
2. **batch_macro** — *"me dê um resumo dessa macro"*. Acumula os posts novos da macro e dispara uma única notificação agregada ("5 novos em Tech BR"). Bom para fontes ativas.
3. **batch_global** — *"me chame uma vez só"*. Junta tudo de tudo em uma notificação diária. Ruído mínimo.

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

```sh
npm install
npm run dev
```

Abra <http://localhost:5173>, crie um Consumer em `/user`, vá em `/browse/import` e cole uma URL de feed. Ou pegue um `.notfeed.json` qualquer e arraste pra mesma página.

### Primeiro feed em 30 segundos

1. `/user` → criar usuário consumer
2. `/browse/import` → aba **URLs**, colar `https://hnrss.org/frontpage` → Importar
3. `/library` → ativar o nó da fonte
4. `/` → primeiro tick traz os posts (ou aperte refresh manual)

---

## Run targets

### 🌐 Web / PWA

```sh
npm run build
npm run preview   # http://localhost:4173 com SW ativo
```

Em produção, o navegador detecta `manifest.webmanifest` + service worker e oferece **"Instalar app"**. Depois de instalado, abre offline (assets pré-cacheados, SPA fallback).

### 🖥️ Tauri — AppImage Linux

Pré-requisitos de sistema (GTK, WebKit2GTK, libfuse2 em runtime): veja [docs/build-targets.md](docs/build-targets.md).

```sh
npm run tauri:dev          # janela nativa com HMR
npm run tauri:appimage     # → src-tauri/target/release/bundle/appimage/Notfeed_<version>_amd64.AppImage
```

Em runtime Tauri:
- Service Worker **não** é registrado (gating em `+layout.svelte`)
- Fetches usam `tauri-plugin-http` (sem CORS proxy)
- Notificações via `tauri-plugin-notification`
- IndexedDB do WebKit2GTK é a persistência atual; SQLite via `tauri-plugin-sql` está reservado para Plano C

Outros bundles (`.deb`, `.rpm`, `.msi`, `.dmg`, Android TWA) ficam para iterações futuras.

---

## Stack

| Camada | Escolha |
|---|---|
| Framework | **SvelteKit** (SPA, `adapter-static`) |
| UI | **Svelte 5** runes + **Tailwind 4** + bits-ui (shadcn-svelte) |
| Linguagem | **TypeScript** estrito (svelte-check 0/0/0) |
| Persistência | **IndexedDB** atrás de `StorageBackend` |
| Desktop | **Tauri 2** (plugins http, shell, notification, updater) |
| Testes | **vitest** + jsdom + @testing-library/svelte |
| Ícones | **Lucide** (`@lucide/svelte`) |
| i18n | sistema próprio reativo (en-US, pt-BR) |

---

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Vite + HMR) |
| `npm run build` | Build de produção (emite `service-worker.js` e `manifest.webmanifest`) |
| `npm run preview` | Preview do build com SW ativo |
| `npm run check` | Type-check (`svelte-check`) |
| `npm run test` | Testes em watch mode |
| `npm run test:run` | Testes em batch (CI) |
| `npm run icons:gen` | Regenera ícones PWA a partir de `static/icons/source.svg` |
| `npm run tauri:dev` | Tauri em modo dev (janela nativa + HMR) |
| `npm run tauri:appimage` | Bundle AppImage Linux x86_64 |

---

## Mapa de rotas

### Consumer
| Rota | O que tem ali |
|---|---|
| `/` | Feed — timeline com filtros, macros, entity filter, category filter |
| `/browse` | Navegação pelas árvores disponíveis (busca + filtros) |
| `/browse/import` | Importar `.notfeed.json` ou URLs simples |
| `/browse/node/[id]` | Detalhe de qualquer nó (perfil, fonte, coleção…) |
| `/library` | Suas ativações organizadas em tabs (📚 All, ⭐ Favorites, custom) |
| `/library/node/[id]` | Detalhe de nó na library |
| `/user` | Multi-conta, troca de identidade, settings, ingestion tiers |

### Creator
| Rota | O que tem ali |
|---|---|
| `/pages` | Lista de ContentTrees do creator |
| `/pages/new` · `/pages/[id]` | Editor de árvore (CRUD de nós e seções) |
| `/preview` · `/preview/node/[id]` | Preview do snapshot publicado |

### Layout adaptativo
- ≥ 900px → sidebar fixa de 295px + main scrollável
- < 900px → bottom nav de 56px (mobile-first)

---

## Documentação

A pasta [docs/](docs/) é a fonte da verdade técnica:

- [overview.md](docs/requirements/overview.md) — visão geral, escopo implementado, princípios
- [architecture.md](docs/architecture.md) — ADRs (decisões arquiteturais numeradas)
- [glossary.md](docs/glossary.md) — vocabulário do domínio
- [requirements/](docs/requirements/) — fonts, content-trees, ingestion, profiles, categories, persistence, users, platforms
- [build-targets.md](docs/build-targets.md) — pré-requisitos por plataforma
- [steps/](docs/steps/) — roadmap por fase

---

## Licença

MIT — veja [LICENSE-MIT.md](LICENSE-MIT.md).
