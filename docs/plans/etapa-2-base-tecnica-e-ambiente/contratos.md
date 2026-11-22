# Contratos técnicos da etapa 2

O [manifesto](contracts/etapa-2.json) fixa o escopo e a ordem. Os registros abaixo são produzidos na execução, validados com Node e testes de contrato. Não é necessário instalar um validador genérico de schemas. Campo obrigatório ausente, ID desconhecido, tipo incorreto, referência inexistente ou estado incoerente deve reprovar a validação.

## C01 Referência verificável

Em 2.1b criar `tooling/maintenance/contracts/baseline.json` com `schemaVersion: 1`, revisão Git, hash da árvore auditada, diff e arquivos adicionais necessários à reprodução, versões observadas, hashes dos lockfiles e os inventários abaixo. Não registrar segredos ou arquivos pessoais.

| Inventário            | Campos e comparação obrigatórios                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Fontes e configuração | Caminho, SHA-256, classificação produto/tooling/documentação; arquivos gerados excluídos explicitamente                                |
| Dependências          | Ecossistema, nome, versão, consumidor, relação direta/transitiva/peer/opcional, caminho no grafo, integridade/origem quando disponível |
| Testes                | Arquivo e nome completo de cada caso; mapeamento justificado para eventual renomeação, conservando assertions                          |
| Dados públicos        | Banco, versão, stores, índices, chaves, rotas, export `.notfeed.json`, identificadores e configuração Tauri                            |
| Dívida histórica      | Ocorrência sintática de tipo/supressão, arquivo e âncora; sem allowance por arquivo inteiro                                            |
| Ambiente              | OS/arquitetura, Node/npm/Rust/Cargo, navegadores, ferramentas nativas, scripts e lacunas do dev                                        |

Produzir uma receita de reconstrução da **entrada da etapa 2**, com fontes e locks exatos, em área sintética isolada. Preferir revisão Git já disponível; se houver alterações relevantes não commitadas, preservar snapshot/diff e arquivos adicionais com hashes. A receita deve funcionar fora da árvore de trabalho atual. Não depender de `node_modules`, refs locais desconhecidos ou builds pré-existentes. O inventário captura a entrada antes de escrever seus próprios registros; não incluir o próprio inventário no hash que ele descreve.

A receita usada pelo teste cotidiano de atualização fica em `tooling/e2e/reference/stage-2-entry.json`, com revisão/hash e método explícito de preparar as versões de Node/npm necessárias à referência em isolamento. O teste não importa o árbitro nem os recibos de manutenção. `baseline.json` aponta para essa receita, sem criar um segundo destino ativo. O ambiente do candidato permanece nas versões atuais; reconstruir a referência não pode trocar o gerenciador global ou os locks dele.

O novo baseline não substitui P1/P6 nos registros históricos. Ele serve à comparação de manutenção e à atualização PWA entrada → saída desta etapa. Artefatos e fontes reconstruídos ficam em `.artifacts/`, sem segunda aplicação ativa.

## C02 Ferramentas e versões

Autorização do usuário em 21/11/2026: incluir mise no plano como ferramenta de provisionamento de desenvolvimento, conforme C11 e ADR 017. Sua versão e integridade serão selecionadas no início de 2.5/provision, sem atualizar os pins de Node/pnpm/Rust/auditor já aprovados. Esta entrega não instala mise nem acrescenta dependências aos manifests do produto.

Autorização adicional do usuário em 20/11/2026: `semver` 7.8.6 como dependência de desenvolvimento da raiz, para classificar faixas dos advisories por versão concreta e comparar resoluções/peers. Declarar o import direto; sem biblioteca de runtime ou novo alvo.

Autorização do usuário em 20/11/2026: prever `cargo-audit` e os pacotes de suporte abaixo, somente para desenvolvimento. pnpm, ESLint, Prettier, rustfmt e Clippy fazem parte da proposta; Playwright já foi autorizado e incorporado na etapa 1.

| Ferramenta                          | Uso e local                                                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| pnpm                                | Gerenciador JS/TS; versão exata em `packageManager`, coerente com setup/CI                                       |
| mise                                | Provisionamento e seleção por projeto; bootstrap fixado, configuração e lock de ferramentas; tarefas web/desktop |
| ESLint e `@eslint/js`               | Regras JS e configuração na raiz                                                                                 |
| `typescript-eslint` e `globals`     | Tipagem/parser e ambientes explícitos das fontes verificadas                                                     |
| `eslint-plugin-svelte`              | Parse e regras de componentes Svelte                                                                             |
| Prettier e `prettier-plugin-svelte` | Formatação JS/TS/Svelte e documentos ativos                                                                      |
| `eslint-config-prettier`            | Separar regras de formatação das de qualidade; não desligar regras de segurança/correção                         |
| rustfmt e Clippy                    | Componentes da toolchain Rust fixada                                                                             |
| `cargo-audit`                       | CLI de desenvolvimento fixada, sem virar dependência do crate de produto                                         |

As transitivas necessárias seguem os locks; novos imports diretos de tooling devem usar pacotes declarados no consumidor. Esta autorização não abrange novos parsers, drivers nativos, orquestradores ou bibliotecas de produto. Uma necessidade adicional aciona consulta antes da instalação.

Em 2.1b criar `toolchain.json`: cada entrada contém nome, versão exata selecionada, versão atual, fonte oficial, data de consulta, compatibilidade/engines/MSRV, método de instalação reproduzível e fase de adoção. Fixar Node mantido, pnpm compatível, Rust estável exato, CLI de auditoria e conjunto ESLint/Prettier compatível com Svelte/TS. Alinhar `@types/node` à linha Node adotada. Verificar se a versão escolhida possui suporte e correção dos riscos selecionados; não escolher `latest` como contrato.

Para 2.3, selecionar pnpm que funcione no Node de entrada. Se não houver opção mantida compatível, registrar e resolver esse pré-requisito como unidade explícita de 2.2, antes da conversão. Não acumular silenciosamente upgrade de runtime com troca de gerenciador.

As versões finais devem coincidir em `.nvmrc`, `engines`/`packageManager`, `rust-toolchain.toml`, instruções, diagnóstico e CI. Não depender do `rustup default` global ou presumir Corepack instalado. Definir instalação exata e verificação de integridade conforme a distribuição escolhida, sem `curl | sh` opaco.

## C03 Auditoria e classificação de segurança

Auditar o grafo JS/TS inteiro, incluindo desenvolvimento; a web usa bibliotecas de build declaradas em `devDependencies` que podem gerar código distribuído. Auditar o `Cargo.lock` e correlacionar cada alerta com o grafo de features realmente compilado. Registrar também crates opcionais/inativas, sem habilitá-las para criar cobertura artificial.

Usar relatórios JSON de `npm audit` antes de 2.3, `pnpm audit` depois e `cargo audit` para Rust. Fixar versão do auditor, horário da consulta, hash do lockfile e revisão da base RustSec. `cargo-audit` verifica o lockfile contra advisories RustSec; não prova sozinho que uma função vulnerável é alcançada pelo app. [RustSec](https://rustsec.org/)

Cada finding de `security.json` possui: ID do advisory; pacote/versão/caminho; origem e severidade; contextos web, SW, desktop ou desenvolvimento; pré-condições; exposição e evidência; versão corrigida; decisão; grupo responsável; prazo/revisão; teste de mitigação quando aplicável. Estados permitidos: `unclassified`, `scheduled`, `fixed`, `mitigated`, `not-applicable`. Nenhum alerta fica sem classificação após 2.1b.

Critérios fixos de decisão:

- **Urgente:** risco aplicável com exploração viável no fluxo atual ou ferramenta exposta, ou vulnerabilidade grave cuja exposição ainda não pôde ser descartada. Resolver em 2.2 antes de trocar gerenciador.
- **Bloqueante no encerramento:** qualquer vulnerabilidade aplicável sem correção/mitigação demonstrada, exposição desconhecida, alerta sem classificação ou avaliação vencida. Severidade baixa, uso somente em dev e preexistência não constituem dispensa.
- **Não aplicável:** exige prova da condição ausente no alvo real, revisão vinculada ao hash/versão e reavaliação a cada mudança do grafo/ambiente. Não usar uma lista genérica de IDs ignorados.
- **Mitigado:** a condição de exploração é impedida por configuração/comportamento testado, com responsável e prazo de reavaliação. Se a medida exigir redesenho ou alteração de regra, consultar antes de implementar.

Em 2.1, o gate exige diagnóstico completo, não ausência de vulnerabilidades. Em 2.2 exige zero urgentes pendentes; em 2.3 exige ausência de novos riscos e conclusão das correções urgentes; em 2.4 cada grupo resolve seus alvos sem acrescentar bloqueantes; em 2.7 não pode restar risco bloqueante. Alertas de manutenção, licença ou descontinuação são classificados separadamente, sem tratá-los automaticamente como exploração demonstrada.

O coletor pode receber saída não zero de um auditor que encontrou vulnerabilidades. Deve guardar esse código e validar o relatório segundo a versão selecionada; o comando de **coleta** só retorna zero se a consulta terminou corretamente e todos os resultados foram preservados. Erro de transporte, schema desconhecido ou saída truncada reprova. O comando de **política** retorna zero somente quando os critérios da fase são satisfeitos. Não usar `|| true`, apagar findings ou apresentar a coleta como aprovação de segurança. Essa separação precisa de testes adversos.

Relatórios online usados para aprovar um gate devem ter sido coletados na própria execução. Uma indisponibilidade deixa o gate pendente; o modo offline serve para diagnóstico/reprodução, nunca para alegar auditoria atual.

## C04 Migração para pnpm

Criar `pnpm-workspace.yaml` com exatamente `apps/web`, `apps/desktop` e `packages/notfeed`. A web passa a declarar `@notfeed/product: workspace:*`; o gate resolve o pacote até a pasta local e rejeita fallback ao registry. [Protocolo workspace](https://pnpm.io/workspaces)

Executar `pnpm import` partindo do lock npm de saída de 2.2, conservado na referência histórica. A importação pode recalcular resoluções: comparar nós **e relações**, versões, peers, opcionais, integridade e duplicação de Svelte/SvelteKit. Todo delta precisa de causa e teste. Não se exige igualdade textual dos locks; não se permite aproveitar a conversão para atualizar deliberadamente bibliotecas. [Importação de lockfile](https://pnpm.io/cli/import)

Converter scripts da raiz/workspaces, hooks Tauri, configurações Playwright e processos que hoje chamam `npm`. Hooks executam o workspace web, sem recursão para o desktop. Remover `package-lock.json` ativo apenas após a comparação e instalação validada. Preservar `Cargo.lock`. Retirar configuração npm obsoleta e manter `.npmrc` apenas no que se aplicar à versão escolhida.

Definir políticas explícitas para engines, peers e scripts de build das dependências. Usar os nomes de configuração da versão selecionada, conferidos na documentação correspondente; não copiar flags entre versões maiores. Permitir somente scripts de pacotes identificados e necessários, incluindo o funcionamento real de ferramentas nativas como Sharp/esbuild quando presentes. Sem hoisting global como correção de import ausente. [Configuração pnpm](https://pnpm.io/settings)

O teste determinante é `pnpm install --frozen-lockfile` em cópia isolada sem `node_modules` nem store reaproveitado, seguido de resolução local, tipos e consumidores reais. Depois repetir com cache aquecido, comprovando que ambos preservam o lock. [Instalação pnpm](https://pnpm.io/cli/install)

## C05 Grupos de atualização

`updates.json` contém grupos ordenados com `id`, dependências e versões antes/depois, motivo, fontes, advisories atendidos, arestas/peers, alterações mínimas esperadas, testes, perfil de gate e predecessor. Nenhuma versão indefinida ou grupo aberto pode iniciar implementação.

Famílias para investigar, sem obrigar mudança se já adequadas: Node/tipos/tooling; Svelte/Kit/adapter/Vite/TS; Vitest/jsdom/Testing Library/Playwright; Tailwind/UI; Workbox/PWA; Helia/libp2p/multiformats; Tauri CLI/API/plugins/crates; utilitários/transitivas afetadas. Ordem segue o grafo e os riscos, não a ordem desta lista. Um plugin JS e sua crate compatível pertencem ao mesmo grupo quando houver acoplamento.

Atualizar somente o recorte e suas transitivas necessárias. Uma atualização que mude API pública de aplicação ou exija redistribuir responsabilidades aciona o fusível. Overrides não são solução padrão: se indispensáveis, demonstrar compatibilidade e registrar decisão, prazo e remoção, sem esconder advisory.

## C06 Checks permanentes e lint

Em 2.1b, definir `lint-policy.json` com arquivos cobertos, regras/níveis, parser e ambientes; todas as fontes ativas JS/TS/Svelte e tooling entram na descoberta. Separar browser, service worker e Node, evitando globais que escondam erro de ambiente. Não limitar o lint aos arquivos modificados.

Em 2.5b adotar a configuração acordada, com zero erros/avisos, inline config desabilitada e nenhuma supressão ativa. A integração TypeScript/Svelte e Prettier deve seguir a configuração compatível com as versões selecionadas. [ESLint na documentação Svelte](https://svelte.dev/docs/cli/eslint)

Preservar os checks úteis de imports, exports, dependências, dados e descoberta de testes da etapa 1. Criar um único destino ativo em `tooling/checks`, com contratos permanentes próprios e sem depender da cadeia P0–P6. Os arquivos históricos permanecem para reconstruir a prova antiga, mas deixam de ser o motor dos comandos cotidianos. Não criar shims para manter a antiga interface de fase.

Em 2.1b podem nascer os verificadores independentes indispensáveis à referência, como a inspeção do bundle; eles já ficam no destino permanente, sem wrapper temporário. Em 2.3 são permitidas apenas as adaptações de execução que a troca de gerenciador exige. Em 2.5a concluir a extração dos checks e eliminar chamadas ativas para a infraestrutura histórica. Testar a execução em cópia sem `.artifacts/migration`; inspecionar que checks permanentes não importam o árbitro histórico.

`test:tooling` executa os testes dos verificadores permanentes, sem validar cadeia de fases. Os testes do árbitro em `tooling/maintenance/tests` pertencem aos gates da etapa 2 e não são pré-requisito para o desenvolvimento posterior.

## C07 Comandos públicos previstos

| Comando final na raiz                                         | Contrato                                                                         |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev`, `pnpm build`, `pnpm preview`                      | Web no workspace correto, argumentos repassados                                  |
| `pnpm pwa:preview`                                            | Build e preview local do SW, sem publicar nem manipular perfil pessoal           |
| `pnpm check` e `pnpm check:e2e`                               | Svelte/TS completos e tipos da infraestrutura de navegador                       |
| `pnpm lint` e `pnpm format:check`                             | Código e formatação do escopo acordado, sem escrever arquivos                    |
| `pnpm test` e `pnpm test:run`                                 | Watch e lote, mesmas condições de ambiente e descoberta                          |
| `pnpm check:architecture` e `pnpm check:restrictions`         | Grafo/exports/dependências e proibições de novos atalhos                         |
| `pnpm check:contracts` e `pnpm test:tooling`                  | Contratos permanentes e testes dos verificadores                                 |
| `pnpm verify:quick`                                           | Tipos, lint, formatação, unitários, contratos, restrições e fronteiras           |
| `pnpm test:e2e:dev`, `pnpm test:e2e`, `pnpm test:e2e:upgrade` | Chromium dev, produção e atualização real preservando dados                      |
| `pnpm check:rust`                                             | Cargo check/test, rustfmt e Clippy, features atuais                              |
| `pnpm tauri:dev`, `pnpm tauri:appimage`                       | Comandos desktop existentes adaptados a pnpm                                     |
| `pnpm run doctor --target web` ou `--target desktop`          | Diagnóstico sem instalar/alterar máquina, falha acionável quando necessário      |
| `pnpm security:collect` e `pnpm security:check`               | Relatórios atuais e política final de segurança                                  |
| `pnpm verify:integration`                                     | Build, cenários reais e provas nativas, na ordem de artefatos descrita nos gates |

Os agregados propagam a primeira falha e não aceitam flags de exclusão. `verify:quick` atende ao trabalho web sem exigir bibliotecas de desktop. O contrato `check:rust` fica no perfil desktop; não se pode alegar integração completa executando somente o perfil web.

## C08 Testes, servidores e dados

Compartilhar launcher/configuração para UTC em watch e lote, independentemente do fuso do shell. Testes que alteram idioma restauram seu estado; manter a interface do produto com seu idioma padrão atual. Usar fixtures locais, relógio controlado e perfis sintéticos. Demonstrar que watch coleta, executa e reexecuta o teste após alteração temporária em cópia isolada, com as mesmas assertions do lote.

Portas: desenvolvimento `localhost:5173`, preview manual `localhost:4173`, E2E de produção/atualização `127.0.0.1:4173`, E2E dev `127.0.0.1:4175`. Preview manual e E2E de produção não rodam simultaneamente nessa porta. Manter Tauri `devUrl` alinhado e usar falha explícita por ocupação, sem escolher outra porta nem reutilizar servidor desconhecido.

HMR continua sem SW no dev. Offline/atualização são provados no build servido localmente. O teste de atualização instala a referência de entrada, produz dados pela UI, troca o build **na mesma origem e contexto**, confirma o novo controlador e compara dados, caches e uso offline. Não bloquear SW, limpar armazenamento, trocar origem ou reimportar dados. Preservar WEB-01–05, PWA-01–02 e DEV-01; novos cenários só onde houver risco concreto.

## C09 Desktop e CI

Preservar crate `notfeed` v0.1.0, lib `notfeed_lib`, `backend-indexeddb` padrão, identidade, capacidades/permissões e `frontendDist: ../../web/build`. Cargo usa `--locked`. Não habilitar SQLite nem usar `--all-features` como ampliação implícita do alvo.

Inspecionar o AppImage contra o binário e os assets **do build atual**. Não comparar bytes de versões novas ao binário histórico. Transformações do empacotador continuam restritas e comprovadas; mudança nelas exige contrato/teste antes de alterar o verificador.

CI mínima web em GitHub Actions, Ubuntu 24.04 x86_64; desenvolvimento local Debian 13. ADR 018 substitui a matriz remota anterior: um job web sempre executado em pull_request, push à main e workflow_dispatch, com Node/pnpm/mise e actions fixados. Exigir instalação congelada, tipos, lint, formatação, fronteiras, restrições, contratos, todos os unitários do produto, testes dos verificadores da CI e build web. ci.json fixa dez checks, setup:ci e artefato proof-web. Não usar condicionais para omitir o job, pull_request_target, permissões de escrita ou continue-on-error.

O contexto runner.temp é usado somente em steps.tools.env, nunca em jobs.web.env. O passo tools persiste as quatro variáveis MISE em GITHUB_ENV antes do bootstrap; os passos posteriores herdam esses diretórios sem sobrescritas. Contrato e teste de exportação real protegem essa fronteira de avaliação do serviço.

Sem Chromium, Rust, auditor ou bibliotecas desktop no provisionamento remoto mínimo. setup:web/setup:desktop e os gates locais completos continuam protegidos. Reavaliar ampliação da CI no fechamento da etapa 3; distribuição e publicação têm escopo posterior próprio. O arquivo rust-toolchain.toml continua definindo o Rust local, com diagnóstico de overrides.

## C10 Evidência e handoff

Cada execução escreve `.artifacts/maintenance/<fase>/<unidade-ou-final>/<id>/evidence.json` com schemaVersion, fase/unidade, revisão, hash de entrada, hash dos contratos, versões, início/fim, perfil, comandos/args/cwd, exit codes, sinais, timeouts, logs, relatórios/testes esperados e realizados, hash final e resultado. O diretório da execução é novo; logs anteriores não contam como execução atual.

Recibos de predecessor são históricos e identificam o checkpoint aprovado. Não exigir que o hash de um predecessor seja igual ao código já alterado pela fase seguinte. Para aprovar a fase atual, executar seus próprios checks sobre as fontes atuais. Nenhum comando de verificação pode alterar fontes, contratos ou locks enquanto o gate roda; arquivos gerados e a anotação de `state.md` são excluídos do hash de entrada.

O recibo da CI inclui scope web-minimum, URL, workflow, run/attempt, commit, hash auditado, jobs exigidos e efetivamente executados, conclusão e hashes dos artefatos. Relato manual ou YAML válido não substitui esse recibo. O estado resume a evidência; não a fabrica.

## C11 Provisionamento por projeto com mise

Contrato adotado para [2.5/provision](fases/2.5f-provisionamento-com-mise.md). Criar `tooling/checks/contracts/provision.json` na execução e validar os campos antes de implementar o bootstrap/setup. Não instalar schema validator, parser TOML ou framework novo; usar Node/saídas estruturadas do mise e testes já disponíveis. O contrato permanente não importa o manifesto do plano.

| Campo ou grupo           | Exigência verificável                                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `schemaVersion`, seleção | Versão do schema; versão exata do mise, fonte oficial, data de consulta, URL/SHA-256 e pré-requisitos do bootstrap Linux x86_64. Nenhuma seleção aberta antes de implementar.                                      |
| Plataformas              | Desenvolvimento Debian 13 x86_64; CI Ubuntu 24.04 x86_64. Registrar OS/arquitetura efetivos; não exigir igualdade de pacotes do SO.                                                                                |
| Pins e autoridade        | Node em .nvmrc, pnpm em packageManager, Rust/componentes em rust-toolchain.toml, auditor em tools.json. Espelhos em engines/contratos/configuração devem coincidir.                                                |
| Backends e locks         | Backend explícito para Node e pnpm JS sob o Node fixado; instalação bloqueada por mise.lock, com resoluções/URLs/integridade pertinentes a Linux x86_64. Rust/auditor conservam seus métodos rustup/Cargo fixados. |
| Perfis e interfaces      | setup:web e setup:desktop conforme a ficha, além de setup:ci para dependências congeladas sem navegador/desktop; setup web não instala/exige Rust, auditor ou GTK. doctor continua sem instalar.                   |
| Diretórios e efeitos     | Ferramentas usuais por usuário fora do repositório; seleção por projeto/processo, sem defaults globais ou edição automática do shell. Diretórios temporários de prova explícitos, sem alterar HOME.                |
| Pacotes do sistema       | Requisitos por distribuição/alvo; diagnóstico acionável e instalação explícita no runner. Sem apt/sudo automático no setup local.                                                                                  |
| Recibo                   | Perfil, OS/arquitetura, versões e caminhos efetivos, hashes de fontes/contratos/locks, comandos/cwd, exit codes, logs, casos realizados, início/fim e limpeza. Falha/skip/timeout/recibo incompleto reprovam.      |

Preservar os pins atuais: Node 24.22.3, pnpm 11.28.12, Rust 1.100.0 e cargo-audit 0.23.0. O novo lock de ferramentas não substitui pnpm-lock.yaml ou Cargo.lock. Atualização posterior deve alterar a declaração responsável e o lock pertinente de forma revisada; setup, doctor e gates não fazem upgrade nem regeneram lock para obter sucesso.

O modo bloqueado também deve valer para instalações implícitas que o mise possa fazer antes de executar uma tarefa ou comando, não apenas para uma chamada explícita de `mise install --locked`. Provar que `mise run setup:web` e a entrada não interativa recusam lock ausente/divergente sem regravá-lo; configuração pessoal não pode substituir essa política. Os validadores/doctor não implementam instalação; a preparação pertence ao setup e à camada mise sob o contrato fixado.

A configuração mise controla o ambiente dos comandos futuros, inclusive o acesso ao auditor em prefixo próprio por versão após setup desktop. Não depender de export feito em processo filho para alterar o shell pai. Rustup mantém a autoridade sobre Rust; overrides incompatíveis são diagnosticados, sem modificar o default pessoal. Não usar pnpm standalone com runtime diferente, Corepack ou pnpm global como fallback.

O bootstrap é uma receita mínima do repositório, executável sem Node. No desenvolvimento valida o mise 2026.11.11 já instalado pelo usuário no PATH, sem download ou substituição. Na CI e nas provas limpas, apenas --install-dir com destino absoluto temporário explícito autoriza download, com integridade verificada antes de executar o mise baixado. Se a receita precisar repetir constantes de versão/hash do contrato para esse primeiro passo, o validador confere a igualdade. Confiar somente no checkout inspecionado, explicitamente no setup/CI; não ampliar diretórios confiáveis do usuário. A versão selecionada deve fornecer as capacidades contratadas; se exigir outra ferramenta não autorizada, aplicar Stop & Ask.

Uma instalação sem ferramentas globais deve produzir o candidato que recebe os checks. Registrar versão/caminho do Node usado pelo gerenciador e pelos scripts; apenas `pnpm --version` não prova o runtime efetivo. A reexecução com cache aquecido preserva fontes e os três locks; erros de rede, integridade ou subprocesso continuam bloqueantes. Sem promessa de bootstrap offline com cache vazio.

Na CI, executar bootstrap e instalação bloqueada antes dos comandos Node dependentes, com um único job web que executa setup:ci antes dos checks. Web/desktop completos continuam nos seus setups e comandos locais. A preparação de ferramentas não pode criar dependência circular entre Node, pnpm e o próprio setup.

A retenção usa as fronteiras/leases existentes: limpar apenas ferramentas e caches temporários criados pela prova, preservar recibos/logs/checkpoints e não apagar caches compartilhados ou ferramentas pessoais. Não criar uma instalação completa para cada teste negativo. Depois da adoção, a falta de `.artifacts/toolchains` não pode impedir o fluxo cotidiano; a referência PWA histórica continua isolada e reproduzível.

Interfaces de verificação a implementar: `node tooling/checks/provision.mjs check` e `prove --target web|desktop`, executadas via mise. O check PROVISION do árbitro exige as provas da própria execução e torna obrigatório o novo fechamento 2.5. A implantação da unidade, sua matriz de checks e a leitura de recibos históricos devem ser testadas antes de mudar o executor; não declarar o gate novo aprovado com a lista antiga.
