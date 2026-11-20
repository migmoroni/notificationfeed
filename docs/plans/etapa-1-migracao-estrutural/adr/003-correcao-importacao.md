# ADR 003 — Correção pontual da importação antes da referência P1

**Data:** 19/11/2026. **Estado:** aceita pelo usuário, que respondeu “autorizo”.

O cenário WEB-03 reproduziu `DataCloneError` na estrutura original: `parsedExport`, um snapshot JSON sem mutações internas na tela, estava em `$state` profundo. Seu proxy era entregue ao `IDBObjectStore.put`, que não aceita proxies.

Usar `$state.raw` somente nessa variável conserva a reatividade por atribuição e entrega o objeto simples à persistência. Não alterar o backend, schema, regras, formato de exportação ou outros estados. O teste pela UI permanece obrigatório e já falhou antes da correção.

O inventário P0 permanece imutável. `tooling/migration/reference/approved-changes.json` registra caminho, transformação literal e hashes normalizados anterior/posterior exatos. O árbitro aceita somente esse delta autorizado; qualquer outra mudança continua falhando. A referência de atualização será o build P1 após a correção.
