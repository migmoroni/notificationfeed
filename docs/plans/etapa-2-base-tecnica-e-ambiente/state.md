# Estado da etapa 2

Atualizado em 22/11/2026. Execução e organização em commits locais autorizadas. Push e envio à main pertencem ao usuário; nenhuma publicação efetuada pelo agente. Etapa 3 sem implementação.

## Situação atual

2.1–2.5 implementadas e aprovadas anteriormente. O usuário aprovou a revisão para CI mínima web (ADR 018): um job web obrigatório em PRs, pushes à main e disparos manuais. 2.6/configuration requalificada e aprovada localmente após corrigir o contexto do workflow. Execução remota aprovada, execution/final 2.6 e consolidação 2.7 continuam pendentes.

Retomada em 22/11/2026: merge e push confirmados na main, revisão 775b826b10d3c6c552c56a34c7f8c85f917f8de8. O run real 45036217137/1 falhou antes de criar jobs; não tem logs nem artefato de aceite. Foi identificado runner.temp em jobs.web.env, campo sem esse contexto. Correção delimitada na ADR 018: steps.tools.env e persistência via GITHUB_ENV. Contrato validado antes da implementação; nova prova inicialmente falhou sobre o workflow antigo e 12 provas direcionadas passaram após a correção. Dados reais do run/jobs e confirmação dos SHAs das actions em .artifacts/maintenance/ci-runner-context. Sem atualização de ferramentas, locks ou produto. O diagnóstico desktop anterior aprovou 25 comandos e todas as versões fixadas, incluindo Chromium. Nenhuma evidência remota aprovada; 2.7 não iniciada.

Workflow, contratos C09/C10/C11, manifesto, verificadores, testes e documentação ativos usam web-minimum. setup:ci prepara Node/pnpm e dependências congeladas, sem Chromium/Rust/auditor. Os setups web/desktop e gates locais completos continuam aplicáveis às mudanças e à consolidação. Reavaliar cobertura remota PWA/desktop e matriz por módulos no fechamento da etapa 3. Distribuição, assinatura, instaladores e publicação têm escopo posterior próprio.

## Recibos

Caminhos relativos a .artifacts/maintenance/:

| Fase                      | Estado                                         | Recibo                                                                                        |
| ------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 2.1/final                 | Aprovada                                       | 2.1/final/2026-11-20T20-05-29.835Z-09b63f0f-109c-4d86-971c-8f63d947265e/evidence.json         |
| 2.2/final                 | Aprovada                                       | 2.2/final/2026-11-20T20-37-44.635Z-39a55d59-148b-42c2-b312-5789e4a58f3c/evidence.json         |
| 2.3/final                 | Aprovada                                       | 2.3/final/2026-11-20T20-58-55.070Z-98a6100c-e2da-4a0d-8bff-c8a8c327dcae/evidence.json         |
| 2.4/final                 | Aprovada                                       | 2.4/final/2026-11-20T23-02-15.229Z-55fdabdc-c378-421d-8dbb-f8b32fb265e7/evidence.json         |
| 2.5/provision             | Aprovada anteriormente, mise 2026.11.12        | 2.5/provision/2026-11-22T03-37-08.857Z-d3f65335-34d7-498a-a72e-f438c40886b4/evidence.json     |
| 2.5/final                 | Aprovada anteriormente, mise 2026.11.12        | 2.5/final/2026-11-22T04-00-31.764Z-5439421f-23c7-4ae0-8b37-9edfa79dd4d1/evidence.json         |
| 2.6/configuration         | Contexto runner corrigido; aprovada localmente | 2.6/configuration/2026-11-22T15-09-04.072Z-c1da1c5d-d15f-4b2f-a90b-fd0f706f226e/evidence.json |
| 2.6/execution/final e 2.7 | Pendentes                                      | Exigem CI mínima real e consolidação técnica local completa                                   |

Recibos anteriores permanecem imutáveis. historical-gates.json ancora os predecessores sem exigir novos checks retroativamente. O último gate completo local, anterior à redução da CI, está em 2.6/configuration/2026-11-22T05-06-03.262Z-d6234a54-50f7-472a-9def-7b2646c684bf/evidence.json; aprovou 107 provas Node, 207 unitários, segurança, Cargo/AppImage e Chromium 1/3/3 nas suas fontes. Não substitui a prova do escopo atual. Detalhes e hashes dessa revisão em .artifacts/maintenance/mise-personal/final-validation.json. O perfil web local 7794227f-f77e-418f-b21c-9c7e66f353fc também é histórico, sem homologação remota.

## Gate atual e handoff

Web-CI-Configuration aprovada: CONTRACT, CI-CONFIG, ARBITER, TOOLING, CI-PROVE e DIFF. 109 provas dos verificadores (38 árbitro/71 permanentes), dez checks web, 207 unitários e 25 provas dos verificadores da CI, todos sem falha/skip. A nova prova executa a exportação real em GITHUB_ENV com espaços no caminho e os casos adversos recusam contexto de job e persistência incompleta. Os 26 relatórios/arquivos foram conferidos por SHA256; 12 payloads temporários descartados automaticamente. .artifacts: aproximadamente 1,75 GiB. CI real permanece pendente para a correção.

Fonte do árbitro: d7dd7404f18a88035dd85d7a3c7732b2ccb1c83bcd850b3739e80630baac916f; contratos: cce4712b74e67409d02a9b994873b174574be442531bbebcc19c4d88444c82d4. CI/PROVISION: fonte 5d1c9c6c00fa65a7a13e728ae2dd4eafd2b631f892716d53e7cafe3dfff8179b; contratos 2fba93f7142b7943bf9399d9de6cf94f4e0f64709f253c15cd47c4a7b4d500e6. Resumo verificável em .artifacts/maintenance/ci-runner-context/final-validation.json; prova limpa em .artifacts/ci/probes/f6ecd38f-5796-41dd-881d-af3941273178/evidence.json. Event=local/runId=0 não aprova homologação remota.

## Gate anterior e evidências históricas

Perfil Web-CI-Configuration: CONTRACT, CI-CONFIG, ARBITER, TOOLING, CI-PROVE e DIFF aprovados. 108 testes dos verificadores (38 árbitro/70 permanentes), sem falha/skip. A prova limpa executou os dez checks de web-minimum: tipos TS/Svelte e E2E, lint, formatação, fronteiras, restrições, contratos, todos os 207 unitários protegidos, 24 testes dos verificadores da CI e build web. Nenhum skip, cancelamento ou falha. Esse aceite não declara testes nativos/PWA remotos executados.

CI-PROVE usa checkout sintético, ferramentas/cache inicialmente vazios, PATH sentinela e setup:ci. Valida a ausência de instalação Chromium, o recibo com apenas LOCK/PREBUILD/DEPENDENCIES, versões efetivas, locks/fontes estáveis, artefato/logs e preservação das ferramentas pessoais. Candidatos descartam seus payloads após a prova. O árbitro também confere os hashes dos arquivos publicados localmente.

Fonte do árbitro: 0a041c0e1a1c16315e324b0fbf242c788b9d066d8a715b27ae2a2cbe201737c2. Contratos do árbitro: 6cd1f1d9734e513e5529369dc738cb750cd38b9871e92041aba4c15b518619f0. A normalização de CI/PROVISION usa fonte d08c7f0a6cd9461a2efa5f2f529bb050ab135b6d7808b74c3bf9eaeef7df7b0f e contratos c0b8bf7d6483618fcf9bef1fd1707587e25215efd2a2da6c22a0ddd20540a6ab; comparar cada recibo pela função produtora. Artefato local atual: /home/miguel/Projects/proprios/notfeed/notfeed-app/.artifacts/ci/probes/55ea2235-b80a-4c80-8cca-2eb44193b2f9/candidate-tcQR2G/source/.artifacts/ci/web/runs/1a464fc1-e349-4cb9-94e0-471b1b6afc57/artifact/evidence.json. Prova limpa: /home/miguel/Projects/proprios/notfeed/notfeed-app/.artifacts/ci/probes/55ea2235-b80a-4c80-8cca-2eb44193b2f9/evidence.json. Event=local/runId=0; não é CI real.

Contrato validado antes da implementação. Testes vermelhos confirmaram a mudança de escopo/runner; após implementação, 18 provas direcionadas passaram. O primeiro gate encontrou uma expectativa antiga de INSTALL no teste do executor. Corrigida para exigir CI-PROVE e seu recibo, mantendo a instalação limpa dentro da prova. Tentativa falha preservada em 2.6/configuration/2026-11-22T14-11-41.293Z-26bb5db8-f8cb-4e6e-bc5f-25be7bde609d/evidence.json; não aprovou nada. O gate seguinte passou sobre as fontes atuais. Houve timeout na revisão automática de permissão antes da primeira execução; repetição única autorizada pelo revisor iniciou o comando, sem rejeição de segurança pendente.

## Invariantes e ambiente

Três workspaces, pacote único de produto, banco notfeed-v2 v18, formatos/contas/URLs, app.notfeed.desktop e permissões preservados. Sem novos módulos de negócio, plataformas, SQLite ativo ou bindings Rust/C++. Contrato → teste → implementação mínima → gate; não relaxar tipos, lint, assertions, descoberta ou segurança. Checks permanentes independem de planos/árbitros históricos.

Debian 13 x86_64 local e Ubuntu 24.04 x86_64 CI. Sem Docker/runner próprio. Mise 2026.11.11 em ~/.local/bin/mise; Node 24.22.3 e pnpm JS 11.28.12 em ~/.local/share/mise/installs. Rust local 1.100.0/rustfmt/Clippy e cargo-audit 0.23.0. Nenhuma atualização de versão nesta revisão. Flexibilização pnpm foi descartada anteriormente; recuperação em .artifacts/maintenance/pnpm-compatibility.

Bootstrap local apenas valida o mise no PATH; instalação isolada somente com --install-dir absoluto explícito. SHA256 oficial Linux x64: be6f46a4cc3d5532acf359f163cf7ce80ceb43e5718d7b9049165a340fb02e2d. SHASUMS256.txt: acae2c0d4b40125fee075065c5dfd7af82e2be16a3f3b2cbe7bea3451d50fc03. Execução: mise exec --; ativação Bash manual opcional. Sem edição de shell/defaults pessoais ou fluxos oficiais concorrentes nvm/Corepack/pnpm global.

mise.lock v4 e sidecars .mise/locks preservados. O guard declarativo confere pins/hashes antes dos comandos; modo locked/checksum nativo obrigatório. pnpm-lock.yaml: 96dbe71580c4f1081c1e2b5f699c477e5009e25f29110b6a125cfc74b0edd2d9; Cargo.lock: 9dbd3613f651c5995c0302761b66bc657509d1a0f03bdc1fb07fe48ed10488e5; mise.lock: fd772fa722cb60f80bb4d9477630f39f9c4891c02279044fd678f3ce6eb59d78. Locks inalterados.

Rustup mantém rust-toolchain.toml; setup desktop usa --no-self-update e auditor em ~/.local/share/notfeed/cargo-audit/0.23.0. Limites locais Cargo agora pertencem a tooling/checks/contracts/tools.json, com os mesmos valores: 2 jobs, incremental/debug intermediário desativados. Setup web não exige Rust/GTK; setup:ci não exige navegador. Apt local explícito; doctor apenas diagnostica. A referência PWA mantém Node/npm históricos isolados.

## Retenção, segurança e recuperação

A prova limpa descartou 12 payloads temporários. .artifacts mede aproximadamente 1,74 GiB na medição de fechamento; não houve recompilação desktop para validar o workflow. Provas em .artifacts/maintenance/ci-minimum: summary.json, personal-before.sha256, cleanup.json e logs. Os 26 relatórios/arquivos do gate foram conferidos por SHA256; ferramentas pessoais e shell preservados. Leases impedem limpeza em curso. Não apagar .artifacts inteira nem remover leases sem comprovar término do processo.

Segurança do último gate completo: 67 combinações condicionais não aplicáveis, zero riscos aplicáveis pendentes; revisões vencem em 27/11/2026. Atualizar a coleta/verificação no fechamento técnico, sem converter a CI mínima em auditoria Rust/PWA. Zero testes Rust de comportamento continuam sendo zero; Cargo/AppImage não provam WebView/notificações.

Na adoção inicial, rustup pessoal foi atualizado indevidamente e restaurado para 1.29.0 por binário oficial SHA256 4acc9acc76d5079515b46346a485974457b5a79893cfb01112423c89aeb5aa10. Configuração/default mantiveram hash 46d451a6b8ea2bed375971c34fee742235e1cd143e34368c6f9211802126de45. Registro em .artifacts/maintenance/provision-recovery/restoration.json; setup/provas posteriores preservam o gerenciador. Checkpoints 2.3/2.4 em .artifacts/maintenance/checkpoints; referência PWA em tooling/e2e/reference. Provas de limpezas anteriores em mise-close e mise-personal.

## Próxima ação

Enviar o commit local da correção do contexto runner por novo `git push origin main`, a cargo do usuário. 2.6/configuration já passou sobre essas fontes; não repetir sem mudança ou falha que justifique. O run anterior 45036217137 falhou e não pode aprovar a fase. Não publicar nem disparar workflow por conta própria. Conferir a nova CI mínima real para as fontes corrigidas: um job web, todos os dez checks e proof-web do mesmo run/attempt, Ubuntu/versões/instalação limpa e hashes verificados pelo serviço. C10 exige escopo web-minimum; recibo antigo/local/de outro escopo não aprova.

Conferidor gh read-only usa API 2026-03-10, paginação explícita em gh 2.46.0, head/merge, ZIP SHA256 e manifesto de provas setup/bootstrap/checks. Após a prova remota, execution/final 2.6 e 2.7 com consolidação local completa. Depois, planejar os módulos da etapa 3 com o usuário. Reavaliar ampliação da CI no fechamento dessa etapa; distribuição permanece posterior.
