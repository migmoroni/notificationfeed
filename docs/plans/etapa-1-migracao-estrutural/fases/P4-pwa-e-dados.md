# P4 — Atualização da PWA e preservação de dados

**Entrada:** P3 aprovado; build de referência P1 e receita de reprodução identificados.

**Contexto necessário:** C05/C06 de [contratos](../contratos.md), cenários de [quality gates](../quality-gates.md), fixtures E2E, manifest, registro/entrypoint do SW e persistência. Abrir rotas ou componentes apenas quando uma falha apontar para eles.

## 1. Especificação

Provar que uma instalação anterior da PWA recebe o build migrado e conserva seus dados. Verificar o conjunto web/PWA na estrutura final sem alterar regras de ingestão, schema ou formato de exportação.

Esta fase estende a prova de atualização da mesma versão para o par P1 → P3. Não é uma migração de banco.

## 2. Contrato/Schema

Fixar o hash do build de referência e a identificação do build migrado. Definir os dados sentinela: contas, árvore importada, fonte ativa, estado de leitura/salvos, chaves locais e dados suficientes para leitura offline.

O teste preserva origem, porta, perfil, IndexedDB e caches entre as duas versões. Deve confirmar a ativação do worker/build novo antes das asserções finais. A aplicação não pode limpar/reimportar dados para simular preservação.

```sh
npm run check:contracts -- --spec P4
```

## 3. Teste

Adaptar PWA-02 para servir primeiro o artefato P1 e depois o migrado. Usar a atualização normal do SW, incluindo reload/ativação quando esse for o comportamento existente. Não alterar o mecanismo do produto apenas para facilitar a prova.

Comparar o snapshot semântico dos dados antes/depois, os valores protegidos e a leitura offline. Confirmar que o teste falha se o build antigo continua ativo ou se um dado sentinela desaparece. Reexecutar WEB-01–05 e PWA-01 com o build novo.

## 4. Implementação mínima

Implementar o auxiliar de troca de builds e a coleta das evidências na infraestrutura de testes. Corrigir apenas referências de paths, escopo ou assets comprovadamente quebradas pela reorganização e previstas nos contratos.

Se o produto já satisfizer os cenários, não alterar suas fontes. Problemas de lógica anterior, parsing XML no SW ou proposta de alterar versão/chaves do banco acionam Stop & Ask; não são absorvidos como refatoração desta fase.

## 5. Quality Gate

```sh
npm run gate:migration -- P4
```

**Aceite:** saída zero em contratos, arquitetura, testes do árbitro, check, Vitest, build e todos os cenários Playwright obrigatórios. Registrar os dois builds, o worker ativo e a comparação dos dados. Banco `notfeed-v2`, versão 18, stores, índices e chaves permanecem iguais.

Manifest, ícones, rotas com ID composto e estilos continuam disponíveis. O teste offline comprova shell e dados já disponíveis; não declara ingestão XML ou execução contínua em background como capacidades verificadas.

**Auditoria:** procurar limpeza de storage, troca de origem, recuperação por importação e bypass do SW que invalidariam a prova. Confirmar que o contexto persistente atravessou a atualização.

**Handoff:** registrar evidência e checkpoint. Manter o artefato de referência apenas como entrada de teste; nenhuma cópia de fonte antiga participa da aplicação.
