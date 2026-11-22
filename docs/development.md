# Desenvolvimento

Use Debian 13 x86_64 no desenvolvimento; a CI usa Ubuntu 24.04 x86_64. Mise 2026.11.11 seleciona Node 24.22.3 (`.nvmrc`) e pnpm 11.28.12 (`packageManager`) por projeto/processo. A raiz coordena `apps/web`, `apps/desktop` e `packages/notfeed`; cada workspace declara suas dependências. `mise.lock` e seus arquivos gerados em `.mise/locks` fixam ferramentas; pnpm-lock.yaml e Cargo.lock fixam as dependências de cada ecossistema.

## Preparar web/PWA

Instale mise 2026.11.11 no seu usuário e disponibilize `mise` no PATH antes de preparar o checkout. Neste ambiente ele está em `~/.local/bin/mise`. O projeto valida o binário existente e não instala nem substitui o gerenciador pessoal.

```sh
mise_executable="$(bash tooling/setup/install-mise.sh)"
# Depois de inspecionar a configuração deste checkout:
"$mise_executable" trust "$PWD/mise.toml"
"$mise_executable" run setup:web
"$mise_executable" exec -- pnpm dev
```

O bootstrap precisa de Bash, curl, certificados CA e utilitários coreutils; o download de Node usa tar. Prepare `ca-certificates curl git tar xz-utils` pelo gerenciador do Debian antes do setup. Node e pnpm prévios não são necessários. O setup valida a seleção/lock, obtém o prebuild de node-datachannel via HTTPS/SHA256, executa instalação pnpm congelada com os scripts aprovados, instala o Chromium fixado e termina com doctor web. Falha de download, checksum ou ferramenta interrompe a preparação. O setup não instala pacotes apt/sudo. Para bibliotecas do Chromium ausentes, após a instalação das dependências use explicitamente `"$mise_executable" exec -- pnpm exec playwright install-deps chromium`; consulte também [build-targets.md](build-targets.md).

O executável do mise pertence ao ambiente pessoal; o bootstrap sem argumentos só valida seu caminho, versão e checksum oficial. Se faltar ou divergir, ele falha sem baixar outra instalação. As ferramentas ficam em `~/.local/share/mise/installs`; `XDG_DATA_HOME` e os diretórios próprios do mise são respeitados. As instalações podem ser compartilhadas entre projetos. O pnpm é a distribuição JS, executada pelo Node selecionado. O setup não altera configurações globais, ferramentas pessoais ou arquivos do shell.

Para selecionar automaticamente as ferramentas ao entrar no projeto no Bash, configure manualmente `eval "$(mise activate bash)"` no seu `~/.bashrc`. Sem ativação, prefixe os comandos abaixo com `mise exec --`. Scripts e CI usam execução explícita.

Somente a CI e as provas de preparação limpa solicitam `bash tooling/setup/install-mise.sh --install-dir <diretório absoluto temporário>`. Esse modo baixa o binário fixado, verifica seu SHA256 antes de executá-lo e não substitui a instalação pessoal. Não existe destino de instalação implícito.

As tarefas e `mise exec` exigem os pins e os hashes dos locks contratados antes de iniciar o comando. O modo nativo bloqueado controla os downloads. O check adicional no ambiente impede que avisos de resolução do mise liberem executáveis globais. Não gerar locks para contornar falhas: atualizações deliberadas precisam revisar declaração, lock/sidecars e contrato de provisionamento juntos.

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

Prepare rustup e as bibliotecas de [build-targets.md](build-targets.md). No Debian 13, rustup está disponível pelo gerenciador do sistema; na CI Ubuntu ele já existe no runner. `mise run setup:desktop` também prepara web, instala Rust 1.100.0 com rustfmt/Clippy e cargo-audit 0.23.0. O rust-toolchain.toml mantém a seleção sem mudar o default global do rustup. Overrides incompatíveis reprovam; o auditor tem prefixo próprio em `~/.local/share/notfeed/cargo-audit/0.23.0`, visível aos próximos comandos via mise.

```sh
mise run setup:desktop
mise exec -- pnpm run doctor --target desktop
mise exec -- pnpm check:rust
mise exec -- pnpm verify:integration
```

`check:rust` executa Cargo check/test com lock, rustfmt e Clippy sem avisos, nas features atuais. `verify:integration` faz diagnóstico desktop, checks Rust e segurança; produz AppImage, inspeciona binário/assets e executa Chromium dev, produção e atualização/offline. O navegador valida o mesmo build inspecionado. Não reconstruir entre a inspeção e esses testes. Os agregados propagam a primeira falha e não aceitam flags para excluir checks.

A referência PWA é reconstruída a partir do bundle Git autossuficiente em tooling/e2e/reference, usando Node/npm históricos em isolamento. O teste mantém origem/contexto, controlador e dados criados pela UI. Artefatos e perfis sintéticos ficam em `.artifacts/`. Há um teste Rust de regressão de segurança para origens URL e `blob:` aninhado. Compilação, esse teste e empacotamento não são E2E da WebView ou das notificações nativas.

## Segurança

`pnpm security:collect` obtém relatórios online atuais de pnpm e cargo-audit, com versões, locks, grafo e saídas originais. Coleta não declara aprovação. `pnpm security:check` faz nova coleta e aplica a política em tooling/checks/contracts/security.json com provas atuais de exposição. Advisory/caminho desconhecido, revisão vencida, condição invalidada ou risco aplicável pendente reprovam. Não há ignore genérico nem renovação automática de decisões.

Os relatórios ficam em `.artifacts/security/`. Ferramenta ausente, erro de transporte, sinal, timeout ou relatório inválido são falhas. Alertas brutos não equivalem automaticamente a exposição do produto; as decisões condicionais precisam continuar sendo demonstradas a cada execução.

## Integração contínua

O workflow .github/workflows/verify.yml executa um único job web em PRs, pushes à main e disparos manuais. O escopo web-minimum exige tipos TS/Svelte e E2E, lint, formatação, fronteiras, restrições, contratos, todos os unitários do produto, testes dos verificadores da CI e build web. Não há filtro de impacto ou job omitido por ser documentação. Uma falha interrompe a execução e reprova o job.

O runner Ubuntu 24.04 prepara mise 2026.11.11 em diretório temporário explícito e ferramentas/dados/cache/configuração/estado novos. Node/pnpm vêm do lock do mise; setup-node serve somente para cache pnpm. `mise run setup:ci` prepara dependências congeladas e o prebuild verificado, sem Chromium, Rust/auditor ou bibliotecas desktop. Esse perfil não substitui setup:web/setup:desktop no desenvolvimento. Os locks nunca são regenerados pelo gate.

`mise exec -- node tooling/checks/ci.mjs check` confere contrato/YAML. `mise exec -- node tooling/checks/ci.mjs prove web` prepara um candidato limpo e executa os mesmos dez checks sem editar ferramentas pessoais, preservando as provas e descartando ferramentas/cache temporários. Para executar o perfil no checkout preparado por setup:ci, use `mise exec -- node tooling/checks/ci.mjs run web`. Provas locais são identificadas como local/runId=0 e não homologam Ubuntu ou GitHub.

O artefato proof-web contém logs/relatórios e provas de preparação, fontes, locks, versões e comandos. Não publica assets, AppImage ou release. A homologação exige consultar o serviço e validar run/attempt/revisão/job e hashes do artefato. O conferidor atual é `node tooling/maintenance/check-ci.mjs --run <id>` ou `--receipt <arquivo>`, usando gh já autenticado em leitura.

PWA/offline/atualização, segurança e Rust/desktop permanecem nos gates locais conforme impacto e na consolidação técnica. Reavaliar a ampliação da CI no fechamento da etapa 3 conforme os módulos reais. Distribuição e publicação têm escopo posterior próprio; a CI mínima não comprova desktop ou comportamento do service worker.

## Espaço de artefatos

Gates descartam dependências e caches dos candidatos isolados após encerrar. Reconstruções históricas descartam checkout, ferramentas temporárias e downloads depois de produzir o build de referência; coletores de segurança e inspetores nativos descartam clones RustSec e extrações. A limpeza também ocorre em falhas, preservando o diagnóstico. Recibos, logs, relatórios, fontes dos candidatos, checkpoints e ferramentas históricas permanecem em `.artifacts/`. As ferramentas habituais mise/Node/pnpm/auditor ficam no usuário, fora do repositório. Dados/cache/estado mise, dependências, Chromium temporário e intermediários de setup das provas são descartados; os recibos permanecem. Não é necessário guardar uma instalação inteira para auditar um gate.

```sh
pnpm artifacts:clean --dry-run
pnpm artifacts:clean
pnpm artifacts:clean --caches
```

O comando normal remove temporários remanescentes de execuções antigas. `--caches` também libera o cache Cargo dos gates e os intermediários de compilação do cargo-audit; a próxima compilação precisará refazê-los. O executável do auditor permanece. O cache Cargo é reutilizado e pode ocupar vários GiB; logs e fontes compactas continuam cumulativos. Não há promessa de tamanho fixo durante uma compilação.

A limpeza recusa caminhos externos, componentes simbólicos e execuções em curso. Leases em `.artifacts/.leases/` identificam essas execuções; após interrupção abrupta, confirme que o processo terminou antes de remover manualmente apenas o lease órfão e repetir a limpeza. Não apague `.artifacts` inteira: ela pode conter checkpoints e as ferramentas usadas neste ambiente.
