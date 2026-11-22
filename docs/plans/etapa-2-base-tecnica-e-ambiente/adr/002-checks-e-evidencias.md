# ADR 002 Checks permanentes e preservação de evidências

**Data:** 20/11/2026. **Estado:** definida para o planejamento solicitado.

## Contexto

Os gates da etapa 1 congelam versões, hashes e a cadeia P0–P6. Essas premissas provaram uma movimentação sem alterações amplas, mas impediriam atualizações autorizadas e o desenvolvimento cotidiano. Há também utilidades E2E ligadas à infraestrutura histórica.

## Decisão

Manter evidências/receitas da migração como histórico. A etapa 2 recebe árbitro e registros próprios em `tooling/maintenance`; os checks permanentes ficam em `tooling/checks`, sem importar o estado das fases. Preservar as provas de comportamento, dados, fronteiras e descoberta de arquivos/testes.

A referência PWA da manutenção é a entrada verificável da etapa 2, reconstruída em isolamento. As fontes antigas não viram uma aplicação ativa. O gate final compara dados/contratos e os artefatos atuais, sem exigir bytes de bibliotecas antigas após atualização.

CI deve executar os comandos reais e produzir recibos vinculados ao código. Configuração escrita, simulação local e resultado de outra revisão não aprovam o fechamento. A coleta de advisories é distinta da política que decide se os riscos encontrados impedem a fase, com códigos e relatórios preservados.

## Alternativas e consequências

Regravar os contratos da migração para aceitar versões novas destruiria o significado da prova antiga. Exigir P0–P6 em cada desenvolvimento criaria dependência de histórico sem relação com a mudança atual. A separação conserva rastreabilidade e permite evoluir, mantendo um único destino ativo para os checks cotidianos.

Não há garantia nova de E2E nativo. A limitação permanece explícita até existir um contrato e ferramentas autorizadas para esse comportamento.
