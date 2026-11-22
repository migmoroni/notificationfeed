# Estado vivo da etapa 1

**Atualizado em:** 19/11/2026

## Situação

**Etapa 1 concluída. P0–P6 aprovadas com saída zero. Etapa 2 não iniciada.**

Estrutura ativa: `apps/web` (`@notfeed/web`), `apps/desktop` (`@notfeed/desktop`, crate Rust existente) e `packages/notfeed` (`@notfeed/product`). Os 338 arquivos de lib mantêm seus agrupamentos no pacote único. Não há raízes antigas, aliases de compatibilidade ou módulos de negócio novos.

## Livro razão

| Fase | Estado | Hash dos arquivos auditados | Evidência |
| --- | --- | --- | --- |
| P0 | Aprovada | `56586bf9958ec567da0accfb13b4c8910c7a2166680135d229058aca00040dc0` | `.artifacts/migration/P0/2026-11-19T22-32-05.047Z/evidence.json` |
| P1 | Aprovada | `b9d5a9f2b5620c5fb81a68caeaa0ac93f5debf23f771d0c0d3e6ed0e2178056f` | `.artifacts/migration/P1/2026-11-19T22-57-45.805Z/evidence.json` |
| P2 | Aprovada | `154ac45b1cc3540b756fa99a940bc77ee30825fb92c02fed7c3bb55983417d00` | `.artifacts/migration/P2/2026-11-19T23-02-50.829Z/evidence.json` |
| P3 | Aprovada | `f0e58e9f68981dc58e5568f60aac8e742a6153da9dcb93c197e7db0eee231033` | `.artifacts/migration/P3/2026-11-19T23-07-46.851Z/evidence.json` |
| P4 | Aprovada | `48cde371c74a00445ec6d8cd33c8f2a55d65238cb309df6db901af8bd41ab85d` | `.artifacts/migration/P4/2026-11-19T23-11-01.428Z/evidence.json` |
| P5 | Aprovada | `3a6391727f0c96778990872a639db938ec9d0fac67517c7566dab2c3f62e841a` | `.artifacts/migration/P5/2026-11-19T23-24-38.224Z/evidence.json` |
| P6 | Aprovada | `099adc669750576a96a2be4f0c3451b6ff7ac5a5a2b69fefc3b6280e0b36eed3` | `.artifacts/migration/P6/2026-11-19T23-48-38.951Z/evidence.json` |

## Verificações finais

- P6: 18 checks obrigatórios executados. Instalação limpa por `npm ci`, lockfile preservado e nenhuma alteração de fonte durante o gate.
- TypeScript/Svelte: zero erros e zero avisos; web e pacote inteiro incluídos. Configuração da raiz permite descoberta pelo editor.
- 207 testes unitários existentes e suas identidades conservadas; 23 provas adversas do árbitro aprovadas.
- Chromium: desenvolvimento (1 caso), produção (3 casos) e atualização P1 → migrado (3 casos); nenhum ignorado, inesperado ou instável.
- PWA: controlador real, build novo ativo, mesma origem/contexto, banco/schema/chaves/contas/árvores/leitura/salvos preservados, inclusive offline após atualização. Data do feed sintético constante durante cada servidor, renovada a cada execução.
- Cargo check/test com lockfile e AppImage aprovados. Bundle extraído; código, recursos, Build ID, identidade, RPATH e 106 assets atuais verificados. O frontend inspecionado é a versão `1795132209052`, também validada nos testes finais de navegador.
- Auditoria: fontes únicas, grafo, exports, dependências, configurações, 15 documentos e 49 links locais após o handoff; `git diff --check` aprovado.

## Checkpoints e recuperação

Checkpoint final: `bd99f5a8b242dda5ebb987b80e43bf9435a64c9e`, ref `refs/migration/stage1-p6`. Bundle de recuperação: `.artifacts/migration/P6/2026-11-19T23-48-38.951Z/checkpoint.bundle`. O hash de todos os arquivos do checkpoint coincide com o gate P6. A anotação de resultados neste arquivo é excluída desse hash por contrato.

HEAD/branch e índice de trabalho foram preservados. As alterações da migração permanecem na árvore de trabalho para revisão; os checkpoints estão em refs próprios. Nenhuma publicação remota foi realizada.

Referência P1 exata: `55de787301f029d386607c25a9c767983017a3bc`, preservada no Git bundle versionado e na receita `tooling/migration/reference/pwa-reference.json`. P6 a reconstruiu em Git isolado, conferiu fontes/lockfile pelo hash auditado, instalou dependências e gerou outro build. Nenhum artefato local anterior é necessário para reconstruí-la. Recibos reais históricos P0–P5 em `reference/approvals.json` preservam a cadeia em clones novos; não substituem checks atuais.

## Decisões vigentes

- ADRs [001](adr/001-escopo-e-topologia.md)/[002](adr/002-gates-e-ferramentas.md): workspace, pacote único e gates estritos.
- Playwright 1.65.1 somente em desenvolvimento; Chromium revisão 1255. Única nova biblioteca autorizada. Versões anteriores de produto conservadas.
- [ADR 003](adr/003-correcao-importacao.md) e [004](adr/004-correcao-publicacao.md): duas correções pontuais de proxies, reproduzidas no Chromium e autorizadas pelo usuário. Deltas literais/hashes em `reference/approved-changes.json`; inventário P0 preservado.
- [ADR 005](adr/005-inspecao-appimage.md): inspeção aceita somente as transformações conhecidas do empacotador, comparando o restante do payload.
- [ADR 006](adr/006-checkpoint-reproduzivel.md): Git bundle, reprodução isolada, recibos históricos e descoberta de tipos pelo editor. A operação rejeitada de mover HEAD/índice não foi executada; a alternativa preservou ambos.

## Limites conservados

- Banco `notfeed-v2`, versão 18. O upgrade destrutivo existente não foi acionado; não houve conversão de dados.
- DOMParser em XML no SW e as chaves históricas diferentes de usuário ativo continuam questões conhecidas. A prova offline não certifica ingestão XML em background.
- Há zero testes Rust. Compilação e empacotamento não representam E2E nativo de WebView/notificações.
- Não houve reescrita para Rust/C++, novas plataformas, bindings, backend ou reorganização de módulos de negócio.

## Próximo trabalho

Definir com o usuário as responsabilidades e os módulos da etapa 2 antes de refatorar regras ou separar o pacote. Nenhuma implementação dessa etapa foi iniciada. Comandos de desenvolvimento e validação estão no README da raiz.
