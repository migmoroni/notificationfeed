# Estado da etapa 2

Atualizado em 22/11/2026. Execução e commits locais autorizados. Push/envio à main pertencem ao usuário; nenhum workflow remoto disparado pelo agente. Etapa 3 sem implementação.

## Situação atual

2.1–2.5 aprovadas anteriormente. A CI mínima real passou para main 4e5e044c29d618f03a18ced59d25dd65cb16838d, run 45037870173/1, Ubuntu 24.04, job web e dez checks. ZIP, manifesto, setup/bootstrap, revisão, locks e hashes foram validados pelo serviço. Recibo: .artifacts/ci/receipts/current-sfBINl/evidence.json; ponteiro .artifacts/ci/latest.json. Essa prova corresponde ao lock anterior à correção de segurança abaixo.

O gate 2.6/execution parou na auditoria porque surgiu RUSTSEC-2026-0592, publicado em 22/11/2026, para url 2.5.8 presente no runtime Linux. Os 19 checks anteriores passaram, incluindo provisionamento, contratos, 109 provas Node, tipos, lint, Clippy, formatação, dev/doctor e 207 unitários. Fase 2.6 não aprovada; 2.7 não iniciada.

## Unidade ativa e contrato

Reaberta adaptação técnica de 2.4/desktop-tauri, conforme ADR 008 e tooling/maintenance/contracts/url-security-fix.json. Registro oficial confirmou url 2.5.9 corrigida e sua exigência de form_urlencoded ^1.2.3. Delta aceito: url 2.5.8 → 2.5.9 e form_urlencoded 1.2.2 → 1.2.3; demais resoluções, Cargo.toml e features preservados. Alvos registrados em updates.json antes do aceite. Cargo metadata --locked aprovou o resultado sem regravar o lock.

Contrato validado antes da atualização. A regressão usa tauri::Url, reexport já existente, sem dependência direta nova. A prova vermelha falhou na origem de blob aninhado com 2.5.8, antes do caso profundo. A prova verde com 2.5.9 preservou origens HTTPS e completou 10.000 prefixos em pilha de 2 MiB. Um teste Rust de segurança; não representa E2E de WebView/notificações. Relatório do executor agora informa a contagem real sem texto fixo de zero testes.

A repetição histórica de 2.4/desktop-tauri falhou em dois testes doctor porque o candidato desse perfil não prepara a confiança do mise adotado depois. Tentativa preservada em 2.4/desktop-tauri/2026-11-22T15-40-28.267Z-55532b87-6dbe-4b93-a2d9-62b17e30166d/evidence.json. Contrato/ADR revisados antes da reexecução: requalificar pelo perfil completo atual 2.5/provision; nova prova exige todos os checks e o bundle antes de PWA. Sem alterar testes de diagnóstico ou confiança global. Requalificação aprovada em 2.5/provision/2026-11-22T15-43-18.574Z-fb10d5eb-9d42-4280-ac31-c60dd773cc30/evidence.json: todos os 27 checks, 110 provas Node (39 árbitro/71 permanentes), 207 unitários, um caso Rust, auditoria sem o novo advisory, Cargo, AppImage inspecionado e Chromium dev/produção/atualização 1/3/3 sem falha/skip/flaky. 2.6/configuration também aprovada em 2.6/configuration/2026-11-22T15-55-46.802Z-034fd1c6-b5d1-4705-a8cb-0ed42f1769c7/evidence.json. Não antecipar 2.7.

Fonte atual do árbitro: f3fda1963c0df89e0041ed80579720f74bf58dc52e7f42b3973becc162a1fd82; contratos: 2352b768c301bdb9e372362a384e89bb894bcdf2a95dfa7523f47d6bceb868f3. O gate completo e a configuração CI têm 39 relatórios conferidos por hash, inclusive após a limpeza. Resumo em .artifacts/maintenance/url-security-fix/final-validation.json; CI usa fonte 48c7f7a99eba8685501c3f95279a90e8505d5ad1fa2dd3158583065cb9fc1da1 e contratos 2fba93f7142b7943bf9399d9de6cf94f4e0f64709f253c15cd47c4a7b4d500e6. A prova limpa CI executou os dez checks e build, 207 unitários e 25 provas Node de CI sem falha/skip. Coleta nova: audit-after.json nesse diretório; 67 achados condicionais revalidados, zero riscos aplicáveis pendentes e ausência de RUSTSEC-2026-0592. Coleta e hashes de CI usam sua própria normalização, sem comparar hashes produzidos por funções diferentes.

## Evidências e predecessores

Caminhos a seguir relativos a .artifacts/maintenance/:

| Fase                     | Situação                                | Recibo                                                                                        |
| ------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| 2.1/final                | Aprovada anteriormente                  | 2.1/final/2026-11-20T20-05-29.835Z-09b63f0f-109c-4d86-971c-8f63d947265e/evidence.json         |
| 2.2/final                | Aprovada anteriormente                  | 2.2/final/2026-11-20T20-37-44.635Z-39a55d59-148b-42c2-b312-5789e4a58f3c/evidence.json         |
| 2.3/final                | Aprovada anteriormente                  | 2.3/final/2026-11-20T20-58-55.070Z-98a6100c-e2da-4a0d-8bff-c8a8c327dcae/evidence.json         |
| 2.4/final                | Anterior ao novo patch transitivo       | 2.4/final/2026-11-20T23-02-15.229Z-55fdabdc-c378-421d-8dbb-f8b32fb265e7/evidence.json         |
| 2.5/provision (anterior) | Aprovada anteriormente, mise 2026.11.12 | 2.5/provision/2026-11-22T03-37-08.857Z-d3f65335-34d7-498a-a72e-f438c40886b4/evidence.json     |
| 2.5/provision (atual)    | Patch requalificado no ambiente atual   | 2.5/provision/2026-11-22T15-43-18.574Z-fb10d5eb-9d42-4280-ac31-c60dd773cc30/evidence.json     |
| 2.5/final                | Aprovada anteriormente, mise 2026.11.12 | 2.5/final/2026-11-22T04-00-31.764Z-5439421f-23c7-4ae0-8b37-9edfa79dd4d1/evidence.json         |
| 2.6/configuration        | Aprovada nas fontes corrigidas          | 2.6/configuration/2026-11-22T15-55-46.802Z-034fd1c6-b5d1-4705-a8cb-0ed42f1769c7/evidence.json |
| 2.6/execution            | Falhou no novo advisory; não aprova     | 2.6/execution/2026-11-22T15-24-59.494Z-8db275ca-3f32-4dbd-9c35-60d4d6c0da3b/evidence.json     |
| 2.6/final e 2.7          | Pendentes                               | Exigem fontes atuais e CI correspondente                                                      |

Provas da correção em .artifacts/maintenance/url-security-fix: registry-version.json, registry-dependencies.json, finding-before.json, Cargo.before.lock, Cargo.proposed.lock, delta.json, update.json, metadata-after.json e regression-before/after.json com logs. A primeira conferência de delta recusou atualização de form_urlencoded e nova ligação cssparser-macros → syn 3; o requisito de form_urlencoded foi verificado e contratado, e a ligação anterior para syn 2 foi preservada e aceita por Cargo --locked.

Histórico imutável: historical-gates.json ancora predecessores sem exigir novos checks retroativamente. Configurações anteriores e provas completas em .artifacts/maintenance/ci-minimum, ci-runner-context e mise-personal. O primeiro run 45036217137 falhou por runner.temp em jobs.web.env; correção steps.tools.env/GITHUB_ENV na ADR 018 e commit 4e5e044, já homologado pelo run 45037870173. Esse run precisa ser substituído por CI das fontes corrigidas antes do fechamento.

## Invariantes, ambiente e recuperação

Três workspaces, pacote único, banco notfeed-v2 v18, formatos, contas, URLs, app.notfeed.desktop e permissões preservados. Sem novos módulos, plataformas, SQLite ativo ou bindings Rust/C++. Não relaxar tipos, lint, descoberta, testes ou segurança. Contrato → teste → implementação mínima → gate; obedecer ao protocolo e às fronteiras do plano.

Debian 13 x64 local e Ubuntu 24.04 x64 CI; sem Docker/runner próprio. Mise pessoal 2026.11.11 em ~/.local/bin/mise; Node 24.22.3/pnpm JS 11.28.12 em ~/.local/share/mise/installs. Rust 1.100.0/rustfmt/Clippy; cargo-audit 0.23.0 em ~/.local/share/notfeed/cargo-audit/0.23.0. Sem alteração desses pins. Bootstrap local valida PATH/checksum; download isolado somente com --install-dir absoluto explícito. Setup não edita shell/defaults. Inclusão de ~/.local/bin no PATH foi solicitada separadamente pelo usuário.

mise.lock/sidecars e pnpm-lock.yaml preservados; Cargo.lock mudou deliberadamente apenas nas duas resoluções contratadas. Detalhes/checksums em url-security-fix.json e delta.json. Rustup usa --no-self-update, preserva default e ferramentas pessoais. Restauração histórica para rustup 1.29.0 documentada em .artifacts/maintenance/provision-recovery/restoration.json; provas posteriores preservam o gerenciador. Caches das provas são temporários e leases impedem limpeza de execuções ativas. Não apagar .artifacts inteira. Cache Cargo e intermediários descartados depois dos gates; .artifacts passou de aproximadamente 6,75 para 1,84 GiB. Os 39 relatórios e todos os logs/recibos foram preservados. Limpeza em .artifacts/maintenance/url-security-fix/cleanup.json.

Os 67 achados condicionais anteriores exigem provas de exposição atuais, com revisões até 27/11/2026. Coleta online desconhecida ou risco bloqueante impedem aceite. Referência PWA e seus runtimes históricos continuam isolados em tooling/e2e/reference. Checkpoints anteriores em .artifacts/maintenance/checkpoints/2.3 e 2.4; não sobrescrevê-los.

## Próxima ação

Patch desktop aprovado em 2.5/provision e configuração 2.6 requalificada nas mesmas fontes. Disponibilizar o commit local corrigido e aguardar novo push do usuário; os gates aprovados não precisam ser repetidos sem mudança/falha que justifique. A nova revisão precisa de CI real correspondente antes de repetir 2.6/execution e fechar 2.6. Depois, adotar o executor/checkpoint de 2.7 com contratos/testes e consolidar. Não publicar nem disparar workflow por conta própria; não considerar o run anterior aprovação de um Cargo.lock diferente. Só então planejar os módulos da etapa 3 com o usuário.
