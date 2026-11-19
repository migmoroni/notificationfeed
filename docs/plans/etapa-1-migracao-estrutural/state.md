# Estado vivo da etapa 1

**Atualizado em:** 19 de novembro de 2026

## Situação

- Plano registrado; execução da migração não iniciada.
- Próxima fase: P0, começando por especificação e testes de contrato do árbitro.
- Nenhum gate P0–P6 foi executado ou aprovado.
- Nenhum aplicativo, pacote, lockfile ou fonte de produto foi alterado ao criar este plano.

## Decisões vigentes

- [ADR 001](adr/001-escopo-e-topologia.md): npm workspaces, um pacote de produto, agrupamentos atuais e nenhuma camada de legado.
- [ADR 002](adr/002-gates-e-ferramentas.md): gates estritos, árbitro com dependências existentes e Playwright autorizado apenas para desenvolvimento.
- Etapa 2 e etapas de novas funcionalidades permanecem fora da execução desta pasta.

## Observações de referência

- `package.json` declara SvelteKit 2, Svelte 5, Vite 7, TypeScript, Vitest/jsdom e Tauri 2; não declara ESLint ou Playwright.
- Ferramentas encontradas durante o planejamento: Node 22.21.1, npm 11.11.1, Rust/Cargo 1.95.0. Node/npm exigiram seleção explícita do ambiente NVM nesta sessão; não gravar caminhos pessoais nos scripts.
- Na avaliação anterior, check e build passaram; 201 de 207 testes passaram e seis testes de datas falharam. São observações históricas, não uma referência verde. P0 deve reproduzir e corrigir a configuração de teste.
- `prepare` atualmente contém `svelte-kit sync || echo ''`; P0 deve retirar o mascaramento de falhas.
- `DOMParser` em RSS/Atom e as chaves diferentes de usuário ativo foram identificados por inspeção. Não foram corrigidos. Os gates não devem afirmar cobertura de ingestão XML em SW.
- Banco atual: `notfeed-v2`, versão 18; qualquer aumento dispara o upgrade destrutivo existente e é proibido nesta etapa.

## Autorizações e pendências

- Usuário autorizou prever Playwright como dependência exclusiva de desenvolvimento em 19/11/2026. Nada foi instalado.
- Não há pergunta pendente de planejamento.
- Versão exata de Playwright será registrada em P1 após verificar compatibilidade e gravar o lockfile. Nenhuma outra nova dependência está autorizada.
- Pré-requisitos completos de empacotamento Tauri ainda não foram certificados por um gate. Ausência futura bloqueia a fase, sem aprovação parcial.

## Livro razão das fases

| Fase | Estado | Contrato | Teste | Implementação | Gate e evidência |
| --- | --- | --- | --- | --- | --- |
| P0 | Não iniciada | Planejado | Não executado | Não iniciada | Não executado |
| P1 | Não iniciada | Planejado | Não executado | Não iniciada | Não executado |
| P2 | Não iniciada | Planejado | Não executado | Não iniciada | Não executado |
| P3 | Não iniciada | Planejado | Não executado | Não iniciada | Não executado |
| P4 | Não iniciada | Planejado | Não executado | Não iniciada | Não executado |
| P5 | Não iniciada | Planejado | Não executado | Não iniciada | Não executado |
| P6 | Não iniciada | Planejado | Não executado | Não iniciada | Não executado |

## Próxima sessão

Ler invariantes, contrato JSON e [P0](fases/P0-referencia-e-arbitro.md). Verificar alterações do usuário, selecionar o ambiente registrado e reproduzir a referência antes de corrigir testes. Não mover diretórios nesta fase.

Ao atualizar este arquivo, substituir o estado vigente e acrescentar somente decisões ou evidências úteis ao próximo turno. Não preencher resultados esperados como se já tivessem sido observados.

## Verificação do planejamento

Em 19/11/2026, a validação documental retornou zero: 18 documentos em `docs/plans`, 41 links locais existentes, manifesto JSON válido e sete fichas com os cinco passos obrigatórios e comandos de gate. Identidade Tauri e nome/versão do banco foram comparados com as fontes atuais. Também foram verificados espaços finais, blocos de código e `git diff --check`, incluindo inspeção dos documentos novos não rastreados.

Esse resultado valida os documentos, não a implementação dos comandos planejados nem os gates P0–P6.
