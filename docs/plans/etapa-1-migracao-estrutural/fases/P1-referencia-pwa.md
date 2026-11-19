# P1 — Referência de comportamento web/PWA

**Entrada:** P0 aprovado, fontes ainda na localização original.

**Contexto necessário:** referência de P0, C05–C08 de [contratos](../contratos.md), cenários de [quality gates](../quality-gates.md), scripts de build, registro do SW e telas estritamente envolvidas nos fluxos testados.

## 1. Especificação

Transformar os fluxos essenciais do produto atual em testes reproduzíveis em navegador real, antes da movimentação. O escopo é WEB-01–05 e PWA-01–02. PWA-02 usa inicialmente a mesma versão nos dois lados para validar o procedimento de atualização e preservação de dados.

Não reorganizar fontes nem adicionar funcionalidades para facilitar testes.

## 2. Contrato/Schema

Para cada cenário, registrar estado inicial, ações observáveis, dados esperados e condição de conclusão. Fixar fixtures sintéticas de feed, exportação e usuários, sem dados pessoais ou serviços externos instáveis. Publicação/exportação deve verificar o fluxo existente com transporte local controlado, sem publicar em uma rede real.

Definir servidor de build, origem estável, perfil persistente, controle de rede e protocolo de troca de build. Fixar a versão compatível de `@playwright/test` e seus navegadores ao instalar. Essa dependência de desenvolvimento já foi autorizada; outras bibliotecas continuam sujeitas ao fusível.

O contrato exige SW real e controle da página. A coleta de evidências deve identificar o worker/build ativo, para que servir o build novo sem ativá-lo não produza um falso positivo.

```sh
npm run check:contracts -- --spec P1
```

## 3. Teste

Escrever os cenários em `tooling/e2e` antes de adaptar servidor ou scripts de execução. Usar asserções de dados e interface, sem sleeps fixos para simular prontidão.

Demonstrar que a prova de persistência detecta perda de um dado sentinela e que a de offline falha quando não há SW/controlador válido. Essas situações adversas devem ocorrer em fixtures/contextos de teste dedicados; não apagar dados reais nem afrouxar o cenário positivo.

Testar rotas com IDs compostos, conta ativa, leitura, importação, exportação, assets e shell offline. Comparar os valores persistidos relevantes, não apenas a abertura da página.

## 4. Implementação mínima

- Adicionar Playwright apenas a `devDependencies`, atualizando o lockfile sem upgrades de produto.
- Implementar configuração, servidor local, fixtures e comandos de testes. Incluir os arquivos de infraestrutura na verificação de tipos.
- Usar ferramentas existentes para os auxiliares de servidor e controle dos builds; não acrescentar uma biblioteca de mocks por conveniência.
- Salvar o build aprovado e seu hash em `.artifacts`, junto com a receita para reproduzi-lo a partir do checkpoint P1.

Esse build é entrada de teste de atualização, não código legado ou um segundo aplicativo ativo. Se um fluxo obrigatório falhar na aplicação atual e exigir mudança de negócio, parar e consultar; não omitir o cenário.

## 5. Quality Gate

```sh
npm run gate:migration -- P1
```

**Aceite:** saída zero em contratos, arquitetura, testes do árbitro, tipos, Vitest, build e Playwright. Todos os cenários obrigatórios executados no Chromium local, com o SW habilitado. Nenhum acesso externo não previsto, erro relevante ocultado ou teste ignorado.

**Auditoria:** conferir que a página ficou controlada pelo SW, que o teste offline realmente ficou sem rede e que o teste de atualização manteve origem, perfil e banco. Registrar a identificação do build de referência e a versão do navegador.

**Handoff:** atualizar `state.md` com os cenários, evidências e checkpoint necessários à comparação em P4. P2 começa somente com essa referência aprovada.
