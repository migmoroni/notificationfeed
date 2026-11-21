# Decisões arquiteturais da etapa 2

| ADR                                             | Decisão                                         | Situação                                 |
| ----------------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| [001](001-escopo-e-sequencia.md)                | Base técnica antes da organização modular       | Vigente                                  |
| [002](002-checks-e-evidencias.md)               | Provas históricas e verificações permanentes    | Extração final em 2.5                    |
| [003](003-referencia-e-ferramentas.md)          | Referência e ferramentas autorizadas            | Diagnóstico/gates 2.1 aprovados          |
| [004](004-unidades-e-cache-nativo.md)           | Unidades e cache Cargo                          | Adotada                                  |
| [005](005-pnpm-e-comparacao-de-grafos.md)       | pnpm e grafos canônicos                         | 2.3 aprovada                             |
| [006](006-runtime-e-familia-web.md)             | Runtime, família web e referência               | Unidades aprovadas                       |
| [007](007-grupos-ui-e-assets.md)                | UI/assets e download verificado                 | Unidades aprovadas                       |
| [008](008-familia-desktop-e-rust.md)            | Tauri, segurança transitiva e Rust              | Unidades aprovadas                       |
| [009](009-checks-permanentes.md)                | Checks independentes e cobertura efetiva        | 2.5/checks aprovada                      |
| [010](010-lint-delimitado.md)                   | Lint delimitado e ambientes separados           | 2.5/lint aprovada                        |
| [011](011-formatacao-isolada.md)                | Formatação isolada e prova anterior à aplicação | 2.5/format aprovada                      |
| [012](012-ambiente-de-testes-e-portas.md)       | Ambiente comum e portas estritas                | 2.5/dev aprovada                         |
| [013](013-diagnostico-agregados-e-seguranca.md) | Diagnóstico, agregados e segurança permanentes  | 2.5/doctor aprovada                      |
| [014](014-ci-e-evidencia-remota.md)             | CI e comprovação no serviço                     | Configuration aprovada; CI real pendente |
| [015](015-retencao-de-artefatos.md)             | Retenção de provas e descarte de temporários    | Adotada; gate local completo aprovado    |

Registrar nova ADR somente quando houver escolha relevante, mudança de contrato ou decisão do usuário. Usar título, data, estado, contexto, decisão, alternativas e consequências. Não criar uma ADR para cada comando ou pacote atualizado; versões/grupos e evidências têm registros próprios.

Uma ADR não substitui autorização para biblioteca não prevista, violação de fronteira ou mudança de negócio. A decisão deve preceder a implementação correspondente.
