# ADR 001 Base técnica antes da organização modular

**Data:** 20/11/2026. **Estado:** definida para o planejamento solicitado.

## Contexto

A estrutura já foi migrada. O usuário incluiu uma etapa de manutenção de dependências e ambiente antes de decidir os módulos de negócio, renumerando essa organização para etapa 3. O modelo continua preparado para múltiplas linguagens, com foco atual web/PWA.

## Decisão

Preservar os aplicativos e o pacote único. Dividir a etapa 2 em diagnóstico, correções urgentes, pnpm, atualizações por grupo, ambiente/checks, CI e consolidação. Cada unidade segue contrato/teste antes de implementação, com gate próprio.

pnpm coordena somente JS/TS; Cargo permanece responsável pelo Rust existente. Não criar toolchains ou pacotes para uso futuro. Instalar ferramentas de desenvolvimento já previstas/autorizadas apenas na fase correspondente, depois de selecionar versões compatíveis e validar o contrato.

## Alternativas e consequências

Atualizar todas as bibliotecas junto com pnpm dificultaria atribuir uma regressão à causa. Organizar os módulos agora anteciparia regras que o usuário pretende rever depois. A sequência separada preserva checkpoints e limita o escopo, ao custo dos gates explícitos entre mudanças relacionadas.

Não buscar o último major de todas as dependências. Priorizar riscos, suporte e compatibilidade, mantendo adaptações técnicas pequenas. Redesenho necessário exige decisão explícita.
