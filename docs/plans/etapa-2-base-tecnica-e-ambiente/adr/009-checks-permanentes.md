# ADR 009 — Verificações permanentes

**Data:** 20/11/2026. **Estado:** 2.5/checks aprovada em gate completo.

Os comandos cotidianos pertencem a tooling/checks e usam contratos próprios, sem importar maintenance/migration, planos, recibos ou hashes históricos do produto. Manter as provas de sintaxe/imports/exports/resolução, cobertura real do tsconfig, dívida sintática, dados e bundle. Mover os helpers e seus consumidores para um único destino ativo; não criar reexports de compatibilidade.

project.json fixa topologia atual, exports, módulos virtuais, descoberta de testes, valores do banco/schema e formato público de exportação, identidade e permissões desktop. As fontes de constantes/schema são carregadas pelo suporte TypeScript do Node 24; comparar os valores declarados, sem congelar o arquivo inteiro. A manutenção conserva as verificações históricas exigidas para aprovar esta etapa. restrictions.json preserva o orçamento sintático por arquivo/responsabilidade/âncora, sem dispensar lint.

unit.json exige as 207 identidades atuais e admite casos novos na verificação permanente; falhas, pendências, duplicatas ou omissões reprovam. O gate desta etapa continua exigindo o conjunto exato de entrada. O launcher batch passa ao destino permanente mantendo execução e argumentos; a padronização com watch pertence à unidade dev.

Retirar o produtor P1 obsoleto tooling/e2e/reference.mjs da árvore ativa; sua fonte original permanece no bundle Git histórico. Não alterar os árbitros históricos para manter a interface substituída. A receita de entrada atual continua autossuficiente.

O bundle deve produzir recibo JSON com status passed, incluído nos relatórios do gate, e exigir início do build identificado por NOTFEED_BUILD_STARTED_AT. A prova permanece contra o binário/assets atuais. Os hashes de contratos passam a incluir tooling/checks/contracts. A execução 2.5 respeita a ordem checks → lint → format → dev → doctor; ferramentas de formatação são adotadas em seu próprio consumidor, separadas das ferramentas de lint, sem novas dependências autorizadas.

Provas antes da implementação: pacote importando app/tooling, import calculado proibido, dependência ausente, fonte omitida do tsconfig/Vitest, schema ou identidade alterados, dívida duplicada/movida, caso unitário omitido e comando permanente importando fases devem reprovar. Demonstrar comandos reais em cópia sem diretórios/artefatos de governança. Gate checks é Completo; lint/formatação/doctor entram somente em suas unidades de adoção.

A prova real de cobertura detectou que o tsconfig gerado pelo SvelteKit exclui service-worker.ts do check principal. Diagnóstico isolado com os mesmos strict/checkJs/skipLibCheck existentes passou sem mudança de produto. Adotar tsconfig.worker.json específico, herdando as opções existentes, com include explícito/sem exclusão; check executa também tsc desse projeto. A cobertura deve exigir a união real dos dois projetos e reprovar se qualquer fonte ficar fora. Prova adicionada antes da implementação; não reduzir o conjunto exigido nem sobrescrever o gerado.

Extração implementada sem reexports: helpers de sintaxe/relatórios e seus testes migrados, consumidores da manutenção atualizados, launcher batch no destino permanente. O produtor P1 obsoleto foi removido da árvore atual. Provas atuais: 57 casos Node passaram; comandos públicos de arquitetura/restrições/contratos e tipos passaram. A cópia sem maintenance/migration/planos/recibos executou os comandos e todos os 207 unitários. Cobertura detecta fontes omitidas e protege a união Svelte/worker; nenhum tipo/supressão novo. Tentativa real de lint antes de checks foi recusada antes de INSTALL por ausência do recibo anterior. Bundle agora emite JSON/status para inclusão verificável no gate. Aprovação depende do gate completo.

Gate aprovado: .artifacts/maintenance/2.5/checks/2026-11-20T23-25-52.456Z-d8a9070b-0755-48c8-8dfb-aa3587ff15ed/evidence.json. 57 provas Node, comandos permanentes, tipos Svelte/worker sem erros/avisos, 207 unitários, segurança, Cargo/AppImage e Chromium 1/3/3. Recibo JSON nativo incluído e protegido pelo hash de relatório.
