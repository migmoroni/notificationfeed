# Plano de engenharia da etapa 1

**Data:** 19 de novembro de 2026

**Estado:** Planejado. Nenhuma fase de implementação foi iniciada.

## Invariantes e fronteiras primeiro

A etapa 1 entrega o workspace funcionando com os agrupamentos atuais, podendo concentrar o produto em um único pacote. É proibido antecipar os módulos de negócio da etapa 2, criar camadas de legado, apagar dados locais ou aprovar uma fase cujo gate falhou ou não foi executado.

Antes de consultar tarefas, ler [invariantes e fronteiras](invariantes-e-fronteiras.md) e o [contrato da etapa](contracts/etapa-1.json). Esses arquivos definem a topologia, o grafo permitido, as restrições negativas e os dados protegidos. O [protocolo de execução](protocolo-execucao.md) rege cada turno.

## Resultado e limites

O resultado é o mesmo produto executável em web/PWA e no desktop Tauri existente, organizado em npm workspaces. O código de `src/lib` conserva seus agrupamentos dentro de um único pacote. A implementação Rust existente apenas muda de localização. A etapa não cria backend, novos aplicativos, novos módulos de negócio, WebAssembly ou bibliotecas de produto.

A definição dos módulos e sua refatoração pertencem à etapa 2, a ser detalhada com o usuário depois. Refatorações mais profundas, novas regras e novas funcionalidades pertencem a trabalhos posteriores.

A topologia comporta futuros pacotes Rust/C++ com manifests e ferramentas próprios. npm coordena os workspaces JS/TS desta etapa; não exige que todo pacote futuro seja JavaScript. Bindings, toolchains e integração entre linguagens serão definidos quando houver um consumidor concreto.

Esta pasta concretiza a [proposta de migração](../proposta-migracao-monorepo-modular.md). Sua criação autoriza o registro do plano; não representa execução nem aprovação de seus gates.

## Documentos operacionais

| Documento | Uso |
| --- | --- |
| [Invariantes e fronteiras](invariantes-e-fronteiras.md) | Leis do trabalho, diretórios, dependências e proibições. |
| [Contratos](contratos.md) e [manifesto](contracts/etapa-1.json) | Entradas, saídas, caminhos, interfaces técnicas e valores protegidos. |
| [Quality gates](quality-gates.md) | Comandos, critérios objetivos, testes e evidências exigidas. |
| [Protocolo de execução](protocolo-execucao.md) | Contexto cirúrgico, Builder/Auditor, fusível e handoff. |
| [state.md](state.md) | Estado vivo, próxima ação, pendências e resultados reais. |
| [ADRs](adr/README.md) | Decisões curtas e seus motivos. |

## Fases atômicas

Cada fase segue **Especificação → Contrato validado → Teste → Implementação mínima → Quality Gate**. A etapa de teste precede a alteração de produto; uma falha esperada nessa preparação não equivale à aprovação da fase.

| Fase | Recorte | Dependência |
| --- | --- | --- |
| [P0](fases/P0-referencia-e-arbitro.md) | Referência verde e árbitro de arquitetura | Nenhuma |
| [P1](fases/P1-referencia-pwa.md) | Contratos de comportamento em navegador real | P0 |
| [P2](fases/P2-workspace-e-aplicativos.md) | Workspace e localização dos aplicativos | P1 |
| [P3](fases/P3-pacote-unico.md) | Um único pacote para o código atual | P2 |
| [P4](fases/P4-pwa-e-dados.md) | PWA e dados existentes após a migração | P3 |
| [P5](fases/P5-desktop.md) | Integração e empacotamento do desktop | P4 |
| [P6](fases/P6-consolidacao.md) | Instalação reproduzível e encerramento | P5 |

P0 e P1 detalham a referência inicial da proposta. P2 e P3 detalham a movimentação. P4 e P5 verificam integrações. P6 consolida a entrega. Essa sequência não define módulos de negócio.

## Condição de encerramento

Todos os gates P0–P6 devem ter evidências com saída zero, associadas ao estado de código auditado. O gate final deve executar as verificações completas sem exclusões destinadas a esconder falhas. Documentação, estado e decisões devem refletir a única estrutura ativa. A etapa 2 permanece não iniciada.
