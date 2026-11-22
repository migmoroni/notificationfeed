# Estado da etapa 2

Atualizado em 22/11/2026. Execução e commits locais autorizados. Push/envio à main pertencem ao usuário; nenhum workflow remoto disparado pelo agente. Etapa 3 sem implementação.

## Situação e unidade ativa

2.1–2.6 aprovadas. Última revisão publicada: 4f1736f0bc7624fb9b90d5653f0d55b85e7cb73f. CI mínima real 45043321853/1 aprovada no Ubuntu 24.04, job web e dez checks. Serviço, ZIP, manifesto, revisão, bootstrap/setup, locks e hashes validados: .artifacts/ci/receipts/current-TlIq3o/evidence.json. CI inclui a correção de segurança de URL.

2.6/execution e 2.6/final aprovaram seus 29 checks: 110 provas Node, 207 unitários, um teste Rust de segurança, auditoria atual, Cargo, AppImage inspecionado e Chromium dev/produção/atualização 1/3/3, sem falha/skip/flaky. Resumo com relatórios em .artifacts/maintenance/consolidation/phase-2.6-approved.json. Fontes f3fda1963c0df89e0041ed80579720f74bf58dc52e7f42b3973becc162a1fd82; contratos 2352b768c301bdb9e372362a384e89bb894bcdf2a95dfa7523f47d6bceb868f3. CI usa normalização própria; não comparar hashes de funções diferentes.

Unidade ativa: 2.7. Contrato consolidation.json validado antes da implementação; prova vermelha mostrou contrato aprovado e executor recusando a fase em .artifacts/maintenance/consolidation/contract-and-red.tap. Executor adotado, com CI-REMOTE primeiro e CHECKPOINT antes do perfil local completo. ADR 019 registra a recuperação externa e a exigência de CI das fontes finais. Documentação ativa corrigida; não há aprovação final de 2.7.

Recorte local de 2.7 aprovado: 112 testes dos verificadores (41 árbitro/71 permanentes), contratos realizados, lint e formatação sem avisos. Prova limpa web executou os dez checks, 207 unitários, 25 testes dos verificadores CI e build, sem falha/skip. Recibo .artifacts/ci/probes/629b6a6f-4e7c-4ed4-b296-cb1792d1ab54/evidence.json. Checkpoint .artifacts/maintenance/checkpoints/2.7/current-IyvOGu/evidence.json validou dez comandos de recuperação externa e cinco comandos de bootstrap/setup limpo; arquivos, locks, fonte recuperada e índice original conferidos. O checkpoint anterior current-gbkIEv antecede a formatação final do índice de ADRs, portanto é histórico.

Fontes finais do árbitro: 22ab6f0dcde91a77022f3e8d6e1bf266a35253768810f7c706418c78ec089b12; contratos e395cce5d7b0790fd2c7caaa0a998a2cc229dfaa7991eb72bc019e021b4fe8f7. Fingerprint CI: 7909b845790d8e260b3874b983602d4c0b77725c216202ffa897b19fdfc94f4a; contratos CI 2fba93f7142b7943bf9399d9de6cf94f4e0f64709f253c15cd47c4a7b4d500e6. Resumo em .artifacts/maintenance/consolidation/local-validation.json. Gate 2.7 recusou corretamente a CI antiga por inputHash divergente antes de CHECKPOINT/INSTALL: 2.7/final/2026-11-22T18-21-56.118Z-ec4307d6-9c45-49d0-856e-9abfc57b058b/evidence.json. Falha esperada de proteção, não aprovação nem autorização para dispensar a CI.

## Recibos de predecessores

Caminhos relativos a .artifacts/maintenance/:

| Fase                | Situação                                     | Recibo                                                                                        |
| ------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 2.1/final           | Aprovada                                     | 2.1/final/2026-11-20T20-05-29.835Z-09b63f0f-109c-4d86-971c-8f63d947265e/evidence.json         |
| 2.2/final           | Aprovada                                     | 2.2/final/2026-11-20T20-37-44.635Z-39a55d59-148b-42c2-b312-5789e4a58f3c/evidence.json         |
| 2.3/final           | Aprovada                                     | 2.3/final/2026-11-20T20-58-55.070Z-98a6100c-e2da-4a0d-8bff-c8a8c327dcae/evidence.json         |
| 2.4/final           | Anterior ao patch URL; requalificação abaixo | 2.4/final/2026-11-20T23-02-15.229Z-55fdabdc-c378-421d-8dbb-f8b32fb265e7/evidence.json         |
| 2.5/provision atual | Patch URL requalificado; 27 checks           | 2.5/provision/2026-11-22T15-43-18.574Z-fb10d5eb-9d42-4280-ac31-c60dd773cc30/evidence.json     |
| 2.5/final           | Aprovada anteriormente                       | 2.5/final/2026-11-22T04-00-31.764Z-5439421f-23c7-4ae0-8b37-9edfa79dd4d1/evidence.json         |
| 2.6/configuration   | Aprovada                                     | 2.6/configuration/2026-11-22T15-55-46.802Z-034fd1c6-b5d1-4705-a8cb-0ed42f1769c7/evidence.json |
| 2.6/execution       | Aprovada                                     | 2.6/execution/2026-11-22T17-45-04.223Z-48100fa3-d67c-4418-9603-d4e4e6f4bd52/evidence.json     |
| 2.6/final           | Aprovada                                     | 2.6/final/2026-11-22T18-05-17.792Z-6bba1213-5980-4f8a-b161-5785763eed00/evidence.json         |
| 2.7/final           | Pendente                                     | Exige fontes finais, checkpoint e CI correspondente                                           |

Histórico imutável ancorado por historical-gates.json. Não reescrever recibos nem exigir novos checks retroativamente. Provas anteriores em ci-minimum, ci-runner-context, mise-personal e url-security-fix. O run 45036217137 falhou por runner.temp em jobs.web.env; commit 4e5e044 corrigiu para steps.tools.env/GITHUB_ENV. Run 45037870173 homologou essa correção; o run atual cobre também o patch URL.

## Segurança e decisões preservadas

RUSTSEC-2026-0592 publicado em 22/11/2026 interrompeu a primeira execução de 2.6. Contrato url-security-fix.json e ADR 008 registram a correção: somente url 2.5.8 → 2.5.9 e form_urlencoded 1.2.2 → 1.2.3. Cargo.toml/features e demais resoluções preservados, inclusive cssparser-macros → syn 2. Cargo --locked aceitou o delta. Provas vermelha/verde preservadas em .artifacts/maintenance/url-security-fix; a regressão usa tauri::Url, sem dependência direta nova. Um teste Rust com origens HTTPS/blob e 10.000 prefixos; não representa E2E nativo.

A tentativa histórica 2.4/desktop-tauri em 22/11 falhou em doctor porque aquele instalador precedia a confiança isolada do mise. Contrato revisto antes da reexecução para usar o perfil completo atual 2.5/provision. Sem relaxar testes, confiar globalmente ou adicionar wrapper. Requalificação aprovada e 2.6 concluída. Recibos e detalhes em url-security-fix/final-validation.json.

Auditoria atual: ausência de RUSTSEC-2026-0592, 67 achados condicionais revalidados e zero riscos aplicáveis pendentes. Revisões condicionais vencem até 27/11/2026; não estender automaticamente. Advisory/caminho desconhecido, revisão vencida ou falta de prova bloqueiam o aceite.

## Invariantes, ambiente e recuperação

Três workspaces e pacote único, banco notfeed-v2 v18, formatos, contas, URLs, app.notfeed.desktop e permissões preservados. Sem novos módulos/plataformas, SQLite ativo ou bindings Rust/C++. Não relaxar tipos, lint, descoberta, testes ou segurança. Contrato → teste → implementação mínima → gate.

Debian 13 x64 local; Ubuntu 24.04 x64 na CI. Sem Docker/runner próprio. Mise pessoal 2026.11.11 em ~/.local/bin/mise; Node 24.22.3/pnpm JS 11.28.12; Rust 1.100.0/rustfmt/Clippy; cargo-audit 0.23.0. Pins preservados. Bootstrap local valida PATH/checksum; download isolado somente com --install-dir absoluto explícito. Setup não edita shell/defaults. PATH pessoal foi alterado em solicitação separada do usuário. Rustup usa --no-self-update; restauração histórica registrada em provision-recovery/restoration.json.

mise.lock/sidecars e pnpm-lock.yaml preservados; Cargo.lock mudou apenas nas duas resoluções contratadas. Referência PWA e runtimes históricos continuam isolados em tooling/e2e/reference. Checkpoints antigos em .artifacts/maintenance/checkpoints/2.3 e 2.4 não são sobrescritos. O novo checkpoint 2.7 será individual por execução, com bundle, fontes, hashes, estado e prova de instalação recuperada.

.artifacts contém provas e caches; não apagar inteira. Leases impedem limpeza em execução. Caches nativos são reutilizados durante a sequência e removidos ao encerrar por artifacts:clean --caches. Limpeza atual em consolidation/cleanup.json: cache Cargo removido, 58 relatórios conferidos antes/depois, recibos de 2.6 e logs íntegros; cerca de 1,97 GiB de provas/fontes/checkpoints retidos (2.064.132 KiB). Verificações futuras recriarão caches temporários.

## Próxima ação

Diff auditado e provas locais concluídas; consolidação preparada para publicação pelo usuário no commit local correspondente a estes fingerprints. Depois do push, validar o run das fontes finais por check-ci.mjs --run e executar gate.mjs 2.7; somente saída zero autoriza concluir. Não é preciso repetir 2.6 nem os checks locais já aprovados sem nova mudança/falha; o perfil completo de 2.7 continua obrigatório. Atualizar este estado sem alterar fontes após a CI. Etapa 3 requer definição dos módulos com o usuário.
