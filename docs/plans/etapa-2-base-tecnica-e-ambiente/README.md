# Plano de engenharia da etapa 2

**Data:** 20 de novembro de 2026; ampliação em 21/11/2026. **Situação:** unidade 2.5/provision com mise planejada; as aprovações anteriores de 2.5 e 2.6/configuration permanecem históricas. CI real e consolidação pendentes. Acompanhar [state.md](state.md).

## Invariantes e fronteiras primeiro

Manter `apps/web`, `apps/desktop` e o pacote único `packages/notfeed`. A web consome o pacote; o desktop empacota o artefato web; o pacote não importa aplicativos. Preservar dados, contratos públicos e comportamento existente. Não criar módulos de negócio, camada de legado, plataformas ou integrações Rust/C++ novas.

As [leis e o grafo de dependências](invariantes-e-fronteiras.md) precedem qualquer tarefa. Esta etapa altera ferramentas e dependências, conforme a [proposta vigente](../proposta-migracao-monorepo-modular.md), e prepara uma base verificável para a organização modular da **etapa 3**.

## Resultado esperado

Entregar pnpm com instalação reproduzível, dependências JS/TS e Rust revisadas, riscos bloqueantes resolvidos, versões de ambiente fixadas e comandos locais equivalentes aos da CI. Tipos, lint, formatação, testes, fronteiras, PWA e build nativo devem passar sem reduzir verificações para acomodar falhas.

Preparar as ferramentas com mise por projeto, instalado no usuário, com versões exatas e lock próprio de ferramentas. Debian 13 x86_64 é a referência local e Ubuntu 24.04 x86_64 permanece na CI. Separar setup web e desktop; preservar rustup/rust-toolchain.toml, pnpm/Cargo e os comandos existentes. Docker e runner próprio ficam fora desta etapa.

O foco continua web/PWA, com o Tauri Linux AppImage existente preservado. A etapa não exige atualizar tudo para a versão mais recente. Atualizações principais entram quando necessárias para segurança, suporte ou compatibilidade; adaptações devem permanecer pequenas e com comportamento protegido.

## Como usar este plano

| Documento                                               | Finalidade                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| [Invariantes e fronteiras](invariantes-e-fronteiras.md) | Topologia, dependências e proibições                           |
| [Contratos](contratos.md)                               | Dados de controle, ferramentas, segurança e comandos previstos |
| [Manifesto](contracts/etapa-2.json)                     | Identificadores e critérios comuns legíveis por máquina        |
| [Quality gates](quality-gates.md)                       | Comandos, provas adversas, matriz de impacto e evidências      |
| [Protocolo de execução](protocolo-execucao.md)          | Ciclo obrigatório, Builder/Auditor, consulta e handoff         |
| [Estado vivo](state.md)                                 | Posição atual, decisões, evidências e próxima ação             |
| [ADRs](adr/README.md)                                   | Razões das decisões e alterações de contrato                   |

Os comandos permanentes originais da fase 2.5 estão implementados e suas cinco unidades foram aprovadas. A [unidade adicional de provisionamento](fases/2.5f-provisionamento-com-mise.md) ainda será implementada e validada; atualizar o plano não instala mise nem aprova o ambiente novo.

## Sequência de execução

| Fase                                                                | Unidades atômicas                                                                                              | Resultado de saída                                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [2.1 Diagnóstico e contratos](fases/2.1-diagnostico-e-contratos.md) | 2.1a árbitro; 2.1b referência e decisões técnicas                                                              | Contratos verificados, riscos classificados, versões e grupos exatos registrados |
| [2.2 Correções prioritárias](fases/2.2-correcoes-prioritarias.md)   | Um recorte por risco urgente, ou comprovação de ausência                                                       | Riscos que impedem esperar tratados antes de pnpm                                |
| [2.3 pnpm](fases/2.3-pnpm.md)                                       | Uma migração coerente do gerenciador                                                                           | Lock único JS/TS, resolução local e consumidores validados                       |
| [2.4 Atualizações](fases/2.4-atualizacoes.md)                       | Uma unidade por grupo de compatibilidade                                                                       | Versões mantidas, critérios de segurança atendidos e ambiente fixado             |
| [2.5 Ambiente e checks](fases/2.5-ambiente-e-checks.md)             | Checks, lint, formatação, testes/servidores, diagnóstico e [2.5f mise](fases/2.5f-provisionamento-com-mise.md) | Rotina e preparação por alvo independentes da cadeia histórica                   |
| [2.6 CI](fases/2.6-ci.md)                                           | 2.6a configuração; 2.6b execução real                                                                          | Jobs obrigatórios executados e aprovados para a revisão auditada                 |
| [2.7 Consolidação](fases/2.7-consolidacao.md)                       | Gate completo e handoff                                                                                        | Referência reproduzível para a etapa 3                                           |

Cada unidade percorre **Especificação → Contrato/Schema → Teste → Implementação Mínima → Quality Gate**. Passar uma unidade não aprova automaticamente sua fase. Não iniciar a fase dependente até concluir todas as unidades e o gate de saída da anterior.

A retomada agora começa em `2.5/provision`, seguida do novo fechamento 2.5 e da revalidação de `2.6/configuration`. Depois da publicação feita pelo usuário, conferir CI real em 2.6/execution/final e consolidar 2.7. Não reexecutar as implementações já concluídas nem reutilizar seus recibos como prova do mise. O manifesto registra a ampliação em `plannedExtensions`; habilitar a unidade no executor exige contrato e testes prévios.

As versões exatas e os grupos de atualização foram registrados em 2.1b, com fontes e data de consulta. O plano fixa o processo e os critérios; não transforma a fotografia de versões ou alertas de novembro em uma escolha permanente sem nova verificação.

## Ponto de partida

A [etapa 1](../etapa-1-migracao-estrutural/state.md) registra P0–P6 aprovadas, 207 testes unitários, 23 testes do árbitro, testes Chromium e build AppImage. Esses resultados são históricos; 2.1b verifica novamente a referência atual. Há zero testes Rust de comportamento; compilar e empacotar não significa testar a WebView nativa.

Na inspeção de planejamento, HEAD era `550037cd52eefb700a96da864d07b5ee7149816c`, com a migração estrutural já commitada e a proposta modificada na árvore de trabalho. O estado histórico da etapa 1 descreve o momento anterior a esse commit. A execução deve inventariar a árvore real, incluindo alterações posteriores, sem sobrescrevê-las nem presumir que HEAD sozinho representa o estado testado.

## Encerramento

A etapa só termina quando o gate 2.7 aprovar o conjunto local e conferir a execução real da CI, com fontes equivalentes, contratos e lockfiles identificados. Ferramenta ausente, falha de rede, job não executado ou risco bloqueante deixam trabalho pendente. A etapa 3 permanece sem implementação e requer definição dos módulos com o usuário.
