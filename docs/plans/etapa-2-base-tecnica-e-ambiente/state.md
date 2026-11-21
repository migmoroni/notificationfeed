# Estado da etapa 2

Atualizado em 21/11/2026. Execução autorizada; publicação Git a cargo do usuário. Etapa 3 sem implementação.

## Situação e recibos

Fases 2.1–2.5 e 2.6/configuration aprovadas no escopo anterior. Ampliação 2.5/provision com mise planejada a pedido do usuário; implementação, novo fechamento 2.5 e requalificação de 2.6/configuration pendentes. Conferidor remoto validado localmente; publicação/CI real/2.7 pendentes. Os recibos abaixo preservam a base anterior e não aprovam mise. Caminhos relativos a .artifacts/maintenance/.

| Fase/unidade       | Estado               | Recibo em .artifacts/maintenance/                                                              |
| ------------------ | -------------------- | ---------------------------------------------------------------------------------------------- |
| 2.1/final          | Aprovada             | 2.1/final/2026-11-20T20-05-29.835Z-09b63f0f-109c-4d86-971c-8f63d947265e/evidence.json          |
| 2.2/final          | Aprovada             | 2.2/final/2026-11-20T20-37-44.635Z-39a55d59-148b-42c2-b312-5789e4a58f3c/evidence.json          |
| 2.3/final          | Aprovada             | 2.3/final/2026-11-20T20-58-55.070Z-98a6100c-e2da-4a0d-8bff-c8a8c327dcae/evidence.json          |
| 2.4/node-types     | Aprovada             | 2.4/node-types/2026-11-20T21-13-16.885Z-87a46270-ae9e-4e3b-b93a-e946a0535376/evidence.json     |
| 2.4/web-foundation | Aprovada             | 2.4/web-foundation/2026-11-20T21-44-36.377Z-bcf55f80-b66f-4fc6-bb0d-ef03c11b0479/evidence.json |
| 2.4/test-stack     | Aprovada             | 2.4/test-stack/2026-11-20T21-57-56.046Z-406f629d-6cc8-4756-8ee8-b762a9db5412/evidence.json     |
| 2.4/ui-css         | Aprovada             | 2.4/ui-css/2026-11-20T22-08-28.550Z-5425b1d0-8a35-4f3a-9a92-a08fac96c608/evidence.json         |
| 2.4/pwa-assets     | Aprovada             | 2.4/pwa-assets/2026-11-20T22-20-55.573Z-128cfa61-9b61-4e42-9671-2d8776a62c5b/evidence.json     |
| 2.4/desktop-tauri  | Aprovada             | 2.4/desktop-tauri/2026-11-20T22-34-47.685Z-68d2b330-0fb2-4557-ae10-064b91a0c9d4/evidence.json  |
| 2.4/rust-toolchain | Aprovada             | 2.4/rust-toolchain/2026-11-20T22-50-23.745Z-34918314-ac5f-438c-a785-8390386837b3/evidence.json |
| 2.4/final          | Aprovada             | 2.4/final/2026-11-20T23-02-15.229Z-55fdabdc-c378-421d-8dbb-f8b32fb265e7/evidence.json          |
| 2.5/checks         | Aprovada             | 2.5/checks/2026-11-20T23-25-52.456Z-d8a9070b-0755-48c8-8dfb-aa3587ff15ed/evidence.json         |
| 2.5/lint           | Aprovada             | 2.5/lint/2026-11-20T23-45-06.569Z-b2a4b561-9a2b-435e-8d51-1fc1fd471da5/evidence.json           |
| 2.5/format         | Aprovada             | 2.5/format/2026-11-21T00-06-50.243Z-ce0252e0-dddb-4607-915b-d36730f77a97/evidence.json         |
| 2.5/dev            | Aprovada             | 2.5/dev/2026-11-21T00-17-22.291Z-5cd3c8dc-8b9c-41f7-88e5-9abcdf354b2b/evidence.json            |
| 2.5/doctor         | Aprovada             | 2.5/doctor/2026-11-21T00-42-49.000Z-0ff22927-d7ff-4d78-9a46-1e9b615013e0/evidence.json         |
| 2.5/final          | Aprovada             | 2.5/final/2026-11-21T00-49-56.187Z-5219ca21-5912-497e-8ffb-d2d18d18ccf0/evidence.json          |
| 2.5/provision      | Planejada            | Sem execução; nova unidade de provisionamento com mise                                         |
| 2.6/configuration  | Aprovada             | 2.6/configuration/2026-11-21T01-57-21.948Z-4152e68a-f5f7-4fde-a629-d116fe9886e7/evidence.json  |
| 2.6/execution      | Preparada localmente | Sem prova remota; gate recusa recibo ausente                                                   |
| 2.6/final e 2.7    | Pendentes            | Exigem CI real e consolidação                                                                  |

## Invariantes e decisões

- Três workspaces, um pacote de produto, regras/dados/banco notfeed-v2 v18 e identidade/permissões preservados. Sem organização de negócio, novos plugins/targets, SQLite ativo ou integrações Rust/C++ adicionais.
- Contrato → prova → implementação mínima → gate. Sem relaxar tipos, lint, assertions, segurança, scripts ou inventário de 207 casos. Não editar fontes/contratos/locks durante gate; ledger fora do hash, mas dentro de format:check.
- Ferramentas pnpm, Playwright, lint/Prettier, cargo-audit e semver 7.8.6 raiz/dev autorizadas. Mise incluído no plano por solicitação explícita em 21/11/2026; versão/integridade a selecionar antes da implementação, sem upgrade dos pins atuais.
- ADRs 001–017 preservam escolhas, incluindo Debian 13 local, Ubuntu 24.04 na CI e provisionamento por usuário/projeto. updates.json e *-delta.json explicam versões/arestas. Provas históricas não aprovam fontes novas. Checks/e2e ativos independem de árbitros e planos históricos.

## Base técnica adotada

pnpm 11.28.12, workspace:*, lock JS único e dependências diretas exatas. Instalação limpa/frozen e repetição offline passaram. Política estrita de engines/peers/builds/integridade preservada. Exceções de maturidade somente svelte 5.59.1, baseline-browser-mapping 2.11.39 e tailwind-merge 3.7.1 revisados; não são exceções de segurança. Builds autorizados apenas esbuild 0.28.2, node-datachannel 0.29.0 e fsevents 2.3.3.

Node 24.22.3/tipos 24.19.2; Svelte 5.59.1/Kit 2.70.4/Vite 7.3.8/TS 5.9.3; Vitest 4.1.12; Tailwind 4.3.5/Bits 2.21.0; Workbox 7.4.1/Sharp 0.35.5; família Tauri selecionada. Rust 1.100.0/minimal/rustfmt/Clippy e auditor 0.23.0; mínimo Cargo 1.95 validado com lock Linux. Default rustup global preservado. Helia/IPNS/UnixFS mantidos; CID 13/14 e peer ID interoperam. Overrides somente faixas compatíveis source-map-js e Undici 7, mantendo Undici 8.

Checks permanentes próprios; SvelteKit exclui SW por projeto, então tsconfig.worker.json cobre worker separadamente com opções estritas existentes. Lint JS/TS/Svelte/runas/worker zero avisos, sem inline config. Três supressões ESLint antigas removidas; Rust while-let iterator → for equivalente, sem allow. Prettier 3.10.1/plugin Svelte 4.2.0 e rustfmt aplicados isoladamente a 368 arquivos; locks intactos, sem fontes adicionadas/removidas, segundo check sem diff. Arquivos protegidos preservaram tokens/valores antes da aplicação, sem reescrever baseline.

Último gate completo: 90 provas Node (35 do árbitro e 55 permanentes), tipos/lint/Clippy/formatação, 207 unitários, segurança, Cargo/AppImage e Chromium dev/produção/atualização 1/3/3 sem skip/flaky. Zero testes Rust de comportamento: não alegar cobertura da UI nativa/notificações. Segurança atual: 67 combinações não aplicáveis sob provas frescas e adversas; zero riscos aplicáveis pendentes/urgentes. Não alegar zero alertas brutos. Decisões atuais vencem para revisão em 27/11/2026. Plist 1.10.4/quick-xml 0.42 corrigiram nova exposição nativa detectada pelo gate.

## Falhas e recuperação preservadas

Node 24 alterou reporter padrão; TAP explícito restaurou evidência sem relaxar parser. Timeout upstream de node-datachannel acionou fallback quebrado: cache novo semeado pelo downloader HTTPS/SHA256 da versão oficial, mantendo execução de todos os scripts. Mesmo provisionamento usado na referência histórica. Paths ausentes em mapping e quick-xml compilado foram corrigidos na causa; gates completos repetidos. Formatter support.ts precisou de segunda passagem convergente, tokens preservados. Recibos falhos permanecem arquivados.

Bundle/código/assets atuais são inspecionados antes de servir o mesmo build ao navegador. Binários aprovados desktop preservados com hashes antes da limpeza seletiva de target sintético. Limpezas de caches antigos/falhos registradas; fontes/logs/recibos mantidos. Não limpar cache/candidato em uso nem dados pessoais.

Checkpoint 2.3 reconstruído: 593 arquivos, hash faeb797f8bb1949b11414dfb3edb287f49adcd59e8d08ef6abdcc11e4e7790c2. Checkpoint 2.4: 611 arquivos, hash fb89ca7b4f0c7b4ff9c115d987bb8424a61812bfec37bf1cd981315b20d30505; recuperação em checkout vazio aprovada. Evidências em checkpoints/<fase>/recovery.json. Referência de entrada autossuficiente em tooling/e2e/reference; input hash 8ee5da44f2b4d2c38f595a1645146c0a390c10e896e37ea74376caa0521c4cc9. P0–P6 são históricos.

## Próxima ação e ambiente

O usuário fará commit, push e envio à main e avisará para continuar. Não executar publicação Git/GitHub. Retenção de `.artifacts` concluída e validada; ADR 015 adotada. Próxima unidade: [2.5/provision](fases/2.5f-provisionamento-com-mise.md), começando pela seleção exata/integridade do mise e validação C11. Depois de implementar e aprovar a unidade, executar novo fechamento 2.5 e requalificar 2.6/configuration. Após o aviso de publicação, conferir CI real das fontes atuais, fechar execution/final 2.6 e adotar 2.7.
Conferidor consulta GitHub read-only com API 2026-03-10, comprova run/attempt/jobs/workflow, diferencia head/merge, compara ZIP SHA256 e arquivos extraídos com fontes/contratos/locks locais. gh 2.46.0 não possui --slurp; paginação REST explícita testada, sem ferramenta nova. Gate execution sem recibo foi recusado antes de INSTALL (commands=[]). Nunca usar event=local/runId=0 como prova remota.

Cada perfil CI agora usa diretório de execução novo e espelho de publicação atual; histórico preservado. Uma prova real recusou arquivos antigos no espelho antes da correção. Perfil web isolado passou em verify:quick e 50 testes, com 21 arquivos exatos/hashes validados; paginação também validada no gate completo.

Repo notfeed-app, branch refactor/architecture, HEAD inicial 889802a5803e40e7feac0bceea27cf115fd5fe8a, árvore inicialmente limpa. GitHub main/admin/leitura confirmados; nenhuma publicação remota. 2.6 exige CI real, sem deploy/distribuição ou alteração de proteção de branch. Aguardar a publicação pelo usuário e seu aviso para retomar.

PATH da execução: .artifacts/toolchains/cargo-audit-0.23.0/bin, .artifacts/toolchains/pnpm-11.28.12/node_modules/.bin e .artifacts/toolchains/node-v24.22.3-linux-x64/bin antes do global. Rust via rust-toolchain.toml. Não usar Node 22/auditor 0.22 globais no produto atual. Sandbox perde pipes de subprocessos; executores usam descritores reais. Instalações/rede/Chromium/Cargo/pnpm exigiram escalada aprovada; nenhuma rejeição pendente. Dados de teste sintéticos.

Recibos públicos sob .artifacts/checks: quick/272fad86-24a2-462b-b2ca-830af830f752/evidence.json; integration/2ed25348-1ac5-4fbe-b1c7-19c0b65755cd/evidence.json; rust/e1a5d11e-c511-44d9-9767-9e668330611a/evidence.json. Registro de segurança permanente current-ofdYvz/evidence.json sob .artifacts/security: 67 combinações, nenhuma pendente. GitHub consultado somente para leitura: nenhum workflow ou PR aberto da branch atual; nenhuma escrita externa efetuada.

Evidências locais de CI: .artifacts/ci/web/runs/b20d6678-65cc-485d-a7e6-508f44502912/artifact/evidence.json (50 testes, somente local); .artifacts/maintenance/2.6/execution/artifact-reuse-negative.json e artifact-mirror-before-isolation preservam a falha anterior. Gate recusado por recibo ausente: 2.6/execution/2026-11-21T01-22-59.521Z-4390bc76-fec8-4348-8be7-ac2cc756997d/evidence.json. Limpeza completed-cache-cleanup-2026-11-21.json liberou 2,32 GiB de caches antigos aprovados; fontes/recibos preservados.

Validação local final de execution: 35 provas do árbitro + 51 permanentes e verify:quick com 207 unitários aprovados antes do ajuste de retenção. Recibo em .artifacts/maintenance/2.6/execution/local-validation.json. Conferidor preparado, sem prova de execução no serviço. Snapshot de revisão anterior preservado em ci-publication/review-sources.tar.gz + review-head.bundle; não representa as novas alterações de retenção nem checkpoint final. Nenhuma publicação remota efetuada.

Retenção concluída: `.artifacts` caiu de aproximadamente 67 GiB para 1,6 GiB (1.637.355.520 bytes alocados após limpeza); espaço disponível passou de 15 para 80 GiB. Removidos payloads reproduzíveis e, ao final, caches Cargo/auditor via `pnpm artifacts:clean --caches`. Fontes dos candidatos, recibos/logs/relatórios, checkpoints, referência e ferramentas instaladas preservados.

ADR 015/contrato artifacts.json adotados. Gates limpam dependências/caches dos candidatos ao encerrar, inclusive em falha; reconstrução histórica, auditor e inspetor nativo descartam seus temporários. Leases bloqueiam limpeza durante execuções; recusa demonstrada contra gate real. Instalações frozen, caches novos, scripts e repetição offline mantidos. Cache Cargo é reutilizado, pode ocupar vários GiB e tem limpeza explícita; não há limite fixo de disco durante build. Não remover lease órfão sem confirmar que a execução acabou.

Provas em .artifacts/retention/real-gate-validation.json, live-run-refusal.json e approved-before.json/approved-after.json. 25 recibos aprovados anteriores (1 em formato histórico de logs) e todos os arquivos com hashes declarados foram conferidos antes/depois; o gate novo elevou o total para 26. Fontes do candidato continuaram idênticas após a compactação, dependências/caches/builds temporários ausentes e leases zerados. Gate 2.6/configuration completo aprovado com 90 provas Node, 207 unitários, segurança, Cargo/AppImage e PWA 1/3/3; verify:quick público também aprovado. Uma tentativa inicial restrita de testes encontrou bloqueios de loopback/SQLite do sandbox; os mesmos testes passaram no gate autorizado com acesso adequado, sem relaxar regras.

## Seleção automática de versões — decisão de 21/11/2026

O usuário preferiu manter versões exatas e preparar a adoção do mise. A flexibilização local do pnpm foi descartada: engines/packageManager, políticas, doctor, auditoria, CI e árbitro retornaram à base aprovada em 2fd103f, com pnpm 11.28.12 e pmOnFail=error. Os três arquivos novos da flexibilização foram removidos; evidências históricas e um arquivo de recuperação permanecem em .artifacts/maintenance/pnpm-compatibility. Demais mudanças da etapa 2 e retenção de artefatos preservadas. A adoção mise está agora detalhada em 2.5/provision, sem implementação. Publicação Git segue a cargo do usuário e 2.6/2.7 continuam aguardando CI real.

Reversão validada: verify:quick com 207 unitários, doctor com pnpm 11.28.12 e contrato YAML CI aprovados; pnpm global diferente foi recusado em prova real. Recibo em .artifacts/maintenance/pnpm-compatibility/reverted-evidence.json. Na entrega da reversão, somente este ledger diferia de 2fd103f; sem alteração de índice ou publicação Git.

## Referência Debian 13 — decisão de 21/11/2026

O usuário confirmou Debian 13 como referência local e Ubuntu 24.04 na CI, encerrando a decisão sobre os sistemas. Proposta e ADR 016 registram versões exatas de ferramentas e comandos de validação comuns, com requisitos de sistema por distribuição. Mise ainda não foi implementado. Docker e runner próprio ficam fora desta etapa; eventual imagem Docker futura deve usar Debian. Nenhuma alteração executável de ferramenta, workflow ou gate nesta atualização documental. CI em Ubuntu complementa as provas locais em Debian; não implica igualdade de bibliotecas de sistema ou suporte do AppImage a distribuições anteriores.

## Plano de provisionamento — 21/11/2026

Incluídos ficha 2.5f, C11, E2-INV-13/14 e ADR 017. README, fases 2.5–2.7, gates e protocolo agora exigem preparação por alvo, instalações por usuário fora do repositório, seleção por projeto, bootstrap sem Node global, lock/integridade, provas adversas e requalificação CI. O manifesto declara mise autorizado e a ampliação em plannedExtensions, mantendo fixedUnits e executor atuais até sua adoção testada. Nenhuma ferramenta instalada, configuração mise criada ou gate novo executado nesta entrega de planejamento.

Validação do planejamento: 9 testes existentes de manifesto/árbitro passaram sem falha/skip; validação adicional confirmou o manifesto, os documentos da ampliação e a recusa de provision pelo executor ainda não adotado. Conferidos 52 links locais, formatação dos 15 documentos/manifesto alterados e git diff --check. Esses checks aprovam a atualização documental, não o provisionamento planejado.
