# Desenvolvimento

Use Node 24.22.3 (`.nvmrc`) e pnpm 11.28.12 (`packageManager`). A raiz coordena `apps/web`, `apps/desktop` e `packages/notfeed`; as dependências são declaradas pelo workspace que as usa. Há um lock pnpm e um Cargo.lock do aplicativo desktop.

## Preparar web/PWA

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm run doctor --target web
pnpm dev
```

A instalação mantém os scripts aprovados em pnpm-workspace.yaml. Se precisar preparar o download de node-datachannel em cache novo, antes da instalação execute `node tooling/checks/prebuild.mjs`. O comando confere a versão no lock e HTTPS/SHA256 do artefato oficial, retornando o caminho do cache. Use esse caminho em `npm_config_cache="<cache retornado>" pnpm install --frozen-lockfile`. Não desabilite scripts nem remova o lock.

`pnpm dev` usa localhost:5173, HMR e nenhum service worker. `pnpm pwa:preview` constrói e serve o preview em 127.0.0.1:4173, com SW do build. Porta ocupada gera erro; não há troca automática. Encerre o preview antes de executar E2E de produção, que usa essa mesma porta. E2E dev usa 127.0.0.1:4175 e não reutiliza servidor desconhecido.

## Validar mudanças

```sh
pnpm verify:quick
pnpm test
pnpm format
```

`verify:quick` executa diagnóstico web, tipos Svelte/TS incluindo worker, tipos E2E, lint, formatação, fronteiras, restrições, contratos e unitários. Exige as 207 identidades protegidas e permite novos casos, sem falhas ou testes ignorados. Funciona sem Rust/GTK. `pnpm test` inicia watch; `pnpm test:run` usa lote. Ambos fixam UTC/en-US somente nos processos de teste, com descoberta e assertions comuns. O idioma padrão do aplicativo é preservado.

`pnpm test:tooling` testa os próprios verificadores, incluindo provas adversas e cópias sintéticas; prepara build web para testar a recusa de porta ocupada no preview real. `pnpm check:architecture`, `check:restrictions` e `check:contracts` também podem ser executados individualmente. Os comandos permanentes não dependem de planos nem recibos da migração.

## Desktop e integração

Prepare Rust 1.100.0 com rustfmt/Clippy, cargo-audit 0.23.0 e as bibliotecas de [build-targets.md](build-targets.md). O rust-toolchain.toml seleciona a versão sem trocar o default global do rustup.

```sh
pnpm run doctor --target desktop
pnpm check:rust
pnpm verify:integration
```

`check:rust` executa Cargo check/test com lock, rustfmt e Clippy sem avisos, nas features atuais. `verify:integration` faz diagnóstico desktop, checks Rust e segurança; produz AppImage, inspeciona binário/assets e executa Chromium dev, produção e atualização/offline. O navegador valida o mesmo build inspecionado. Não reconstruir entre a inspeção e esses testes. Os agregados propagam a primeira falha e não aceitam flags para excluir checks.

A referência PWA é reconstruída a partir do bundle Git autossuficiente em tooling/e2e/reference, usando Node/npm históricos em isolamento. O teste mantém origem/contexto, controlador e dados criados pela UI. Artefatos e perfis sintéticos ficam em `.artifacts/`. Há zero testes Rust de comportamento; compilação/pacote não são E2E da WebView ou das notificações nativas.

## Segurança

`pnpm security:collect` obtém relatórios online atuais de pnpm e cargo-audit, com versões, locks, grafo e saídas originais. Coleta não declara aprovação. `pnpm security:check` faz nova coleta e aplica a política em tooling/checks/contracts/security.json com provas atuais de exposição. Advisory/caminho desconhecido, revisão vencida, condição invalidada ou risco aplicável pendente reprovam. Não há ignore genérico nem renovação automática de decisões.

Os relatórios ficam em `.artifacts/security/`. Ferramenta ausente, erro de transporte, sinal, timeout ou relatório inválido são falhas. Alertas brutos não equivalem automaticamente a exposição do produto; as decisões condicionais precisam continuar sendo demonstradas a cada execução.

## Integração contínua

O workflow em .github/workflows/verify.yml usa os mesmos comandos locais, com jobs impact, web, desktop e integration. Código, contratos, locks, configuração ou impacto desconhecido executam todos os consumidores. Documentação sem efeito executável recebe links/diff. O marcador `<!-- notfeed-ci:full -->` no corpo de um PR, ou full no workflow_dispatch, solicita o conjunto completo; o pedido somente aumenta verificações. O agregador recusa falta, skip obrigatório, falha ou cancelamento.

Node/pnpm/Rust/auditor e revisões das actions são fixados. O cache pnpm considera locks/toolchains/OS e mantém instalação congelada; target Cargo não tem cache remoto. O perfil desktop limita paralelismo e debug info/incremental para caber no runner, preservando features e verificações. Artefatos contêm relatórios/logs e traces de falha sintéticos; AppImage não é publicado.

`node tooling/checks/ci.mjs check` valida a configuração. Executar o perfil local com `node tooling/checks/ci.mjs run web` confirma sua orquestração, sem constituir prova de execução no GitHub. A qualificação de uma entrega exige consultar o serviço e conferir run/attempt/revisão, jobs e artefatos correspondentes.

O conferidor de qualificação usa o gh já autenticado, consulta metadados atuais, confirma a relação head/merge de PR e verifica ZIP SHA256 e cada arquivo de prova. A etapa atual expõe `node tooling/maintenance/check-ci.mjs --run <id>` e `--receipt <arquivo>`; ela nunca aprova CI apenas a partir de JSON manual ou de execução local.

## Espaço de artefatos

Gates descartam dependências e caches dos candidatos isolados após encerrar. Reconstruções históricas descartam checkout, ferramentas temporárias e downloads depois de produzir o build de referência; coletores de segurança e inspetores nativos descartam clones RustSec e extrações. A limpeza também ocorre em falhas, preservando o diagnóstico. Recibos, logs, relatórios, fontes dos candidatos, checkpoints e ferramentas instaladas permanecem em `.artifacts/`. Não é necessário guardar uma instalação inteira para auditar um gate.

```sh
pnpm artifacts:clean --dry-run
pnpm artifacts:clean
pnpm artifacts:clean --caches
```

O comando normal remove temporários remanescentes de execuções antigas. `--caches` também libera o cache Cargo dos gates e os intermediários de compilação do cargo-audit; a próxima compilação precisará refazê-los. O executável do auditor permanece. O cache Cargo é reutilizado e pode ocupar vários GiB; logs e fontes compactas continuam cumulativos. Não há promessa de tamanho fixo durante uma compilação.

A limpeza recusa caminhos externos, componentes simbólicos e execuções em curso. Leases em `.artifacts/.leases/` identificam essas execuções; após interrupção abrupta, confirme que o processo terminou antes de remover manualmente apenas o lease órfão e repetir a limpeza. Não apague `.artifacts` inteira: ela pode conter checkpoints e as ferramentas usadas neste ambiente.
