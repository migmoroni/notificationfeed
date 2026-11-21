# ADR 003 — Referência de entrada e seleção das ferramentas

**Data:** 20/11/2026. **Estado:** aceita; diagnóstico e gate de saída 2.1 aprovados.

## Contexto e alternativas

A entrada já contém a migração estrutural commitada. A prova de manutenção precisa comparar essa entrada com o candidato, com ferramentas históricas reproduzíveis e ambiente final independente.

Reutilizar P1 compararia também mudanças da etapa anterior. Depender do Node/npm global impediria reconstruir a referência depois da atualização do ambiente. Essas alternativas foram descartadas em favor de uma receita própria e isolada. Para as versões finais, foram preferidas linhas mantidas e compatíveis; atualizar todos os majors acrescentaria adaptações sem necessidade demonstrada.

## Decisão

Usar a revisão de entrada `889802a5803e40e7feac0bceea27cf115fd5fe8a` como referência própria da etapa 2, em bundle Git autossuficiente. Reconstruir Node 22.21.1/npm 11.11.1 com downloads e integridade fixados na receita. Instalar/buildar em diretório sintético, sem substituir o ambiente global. A referência P1 e seus comprovantes permanecem históricos.

Selecionar pnpm 11.28.12, compatível com o Node de entrada e com suporte publicado até 30/04/2027. Reavaliar essa linha até 31/03/2027. Para o ambiente final, selecionar Node 24.22.3 LTS, tipos Node 24 e Rust 1.100.0, mantendo TypeScript 5.9.3. Atualizações das famílias existentes priorizam patches/minors compatíveis, com versões exatas nos registros. A seleção não significa que foram instaladas ou aprovadas.

Inspecionar separadamente o grafo do lock Rust, os pacotes resolvidos para todos os sistemas e as features realmente compiladas no Linux padrão. Alertas opcionais/inativos permanecem visíveis. Condições de não aplicabilidade precisam de prova revisada, não de uma lista genérica de advisories ignorados.

## Evidência e consequência

A reprodução inicial instalou a entrada e passou no build; Chromium comprovou os cenários atuais e a troca de builds com dados/offline preservados. Uma cópia candidata instalada com cache npm vazio também passou nos tipos web/E2E e nas 207 identidades unitárias. Essas provas foram repetidas no gate completo de diagnóstico e no gate de saída 2.1, ambos aprovados conforme state.md.

A auditoria do npm agrega faixas distintas do mesmo advisory em vários nós. O usuário autorizou `semver` 7.8.6, apenas como dependência direta de desenvolvimento da raiz, para filtrar os caminhos por versão e comparar os locks. A ferramenta foi adotada com testes prévios, sem atualizar bibliotecas de produto; a classificação completa e as condições de exposição passaram no gate 2.1.

O sandbox revelou perda de stdout/stderr em pipes de subprocessos. Os executores passaram a usar descritores de arquivos, e os testes exigem sentinelas reais. O árbitro exige casos e totais TAP, sem falhas/skip/todo/cancelamento. O primeiro recibo de bootstrap ficou superado; a aprovação válida possui logs e relatórios de oito testes.

Fontes e metadados oficiais consultados constam em `tooling/maintenance/contracts/toolchain.json`, `updates.json` e nos artefatos de inventário. Uma mudança de seleção deve voltar ao ciclo de contrato/teste antes da implementação correspondente.
