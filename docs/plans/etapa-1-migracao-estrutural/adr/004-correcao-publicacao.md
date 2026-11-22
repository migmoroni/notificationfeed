# ADR 004 — Snapshot pontual na persistência da publicação

**Data:** 19/11/2026. **Estado:** aceita explicitamente pelo usuário.

O teste WEB-04 reproduziu outro `DataCloneError` anterior à movimentação: a árvore obtida do estado reativo do Creator era incluída em `publication` e entregue diretamente ao IndexedDB.

Aplicar `$state.snapshot(publication)` somente na chamada `pubRepo.save` em `creator.publishTree`. Manter versão, campos, datas e fluxo de publicação. Nenhuma mudança no backend ou nas regras. O cenário de criação/publicação/exportação pela UI continua obrigatório.

O hash anterior/posterior e a transformação literal estão em `tooling/migration/reference/approved-changes.json`, sem regravar o inventário P0 nem ampliar a permissão para outras mudanças.
