# ADR 013 — Diagnóstico, agregados e segurança permanentes

**Data:** 20/11/2026. **Estado:** aprovada no gate completo 2.5/doctor.

A unidade doctor conclui C07: diagnóstico por alvo, verify:quick para web, check:rust e verify:integration para o alvo desktop existente. tools.json e verify.json fixam versões, requisitos e sequência. Não instalar automaticamente. Os agregados não aceitam exclusões; propagam a primeira falha. Quick exige apenas Node/pnpm/Chromium, sem Rust/GTK. Desktop verifica ferramentas/componentes e bibliotecas nativas atuais.

O launcher dos agregados registra comandos/saídas e valida os relatórios reais: 207 identidades unitárias obrigatórias com casos adicionais permitidos, zero falhas/skips/flaky no navegador. O build Tauri e sua inspeção precedem todos os testes finais de navegador; não reconstruir no intervalo. Falha/sinal/timeout reprovam a entrega.

Extrair a coleta e as funções de segurança ativas para tooling/checks. A política permanente contém as 67 combinações atuais revisadas, com condições e prazo originais; não copia a história npm ou mapeamentos de migração. Coleção online nova valida a estrutura e exit codes dos auditores. security:check reavalia grafo/locks e executa provas atuais de exposição; rejeita novo advisory/caminho, revisão vencida e risco aplicável pendente. Não renovar prazo nem reclassificar risco automaticamente. O árbitro de etapa consome o check permanente e mantém somente sua política de fase, sem implementação paralela.

O downloader já aprovado pode ser invocado antes da instalação por um CLI Node independente das dependências instaladas. Ele confirma node-datachannel 0.29.0 no grafo do lock, baixa o artefato oficial HTTPS/SHA256 para cache novo e informa como usá-lo no pnpm install congelado, mantendo todos os scripts. Não instala ferramentas nem muda dependências.

Provas exigidas: web preparado sob PATH sem Rust/GTK; falta/versão incompatível e Chromium ausente com diagnóstico acionável; desktop sem requisito falha; agregador interrompe na primeira falha e preserva argumentos; segurança recusa condição/caminho/prazo/relatório inválidos. Comandos públicos executados diretamente e gate completo antes de 2.6.

As provas iniciais passaram após corrigir a leitura da identificação oficial Google Chrome for Testing, mantendo versão exata e teste adverso. cargo audit --version emite cargo-audit-audit 0.23.0; a identificação da ferramenta usa o binário cargo-audit --version, sem tolerar versão diferente. As auditorias continuam executadas via cargo audit e relatórios validados.

A execução pública revelou colisão: pnpm doctor é um comando interno do gerenciador e ignora o script homônimo. A interface do projeto usa explicitamente pnpm run doctor --target web|desktop, mantendo o nome do script e o diagnóstico contratado. Contrato de agregados, plano ativo e docs foram corrigidos; não há alias nem interceptação do gerenciador. A tentativa falha e seu recibo permanecem arquivados.

verify:quick e verify:integration passaram por suas interfaces públicas, com recibos próprios. O agregado nativo executou check:rust, segurança, AppImage inspecionado e Chromium 1/3/3. O bootstrap também passou em cópia sem node_modules. Auditoria identificou que o exit code isolado de Svelte não reprova avisos por padrão: o agregado e o árbitro compartilham agora o validador de relatório, que exige zero erros/avisos em todas as saídas e rejeita relatório ausente; prova adversa precedeu a implementação.

Gate completo aprovado: .artifacts/maintenance/2.5/doctor/2026-11-21T00-42-49.000Z-0ff22927-d7ff-4d78-9a46-1e9b615013e0/evidence.json. 74 provas Node, tipos/lint/formatação, diagnósticos, 207 unitários, segurança, Cargo/AppImage e Chromium 1/3/3 sem skip/flaky. Falta o gate final da fase 2.5.
