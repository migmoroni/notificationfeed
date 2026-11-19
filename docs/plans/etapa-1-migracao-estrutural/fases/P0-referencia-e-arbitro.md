# P0 — Referência verde e árbitro

**Entrada:** plano registrado; nenhuma movimentação iniciada.

**Contexto necessário:** [invariantes](../invariantes-e-fronteiras.md), [manifesto](../contracts/etapa-1.json), C06–C08 de [contratos](../contratos.md), [quality gates](../quality-gates.md), `package.json`, configurações de testes/tipos e arquivos dos testes que falharem. Ler persistência e imports apenas para extrair os contratos e inventários.

## 1. Especificação

Estabelecer uma referência realmente aprovada antes de mudar caminhos. Criar o árbitro mínimo para verificar as fronteiras desta migração. O árbitro não deve impor arquitetura interna ao produto nem virar uma ferramenta genérica de análise.

Registrar versões, revisão/hash de origem, arquivos de código, dependências resolvidas, identidades dos testes, rotas, dados protegidos e ocorrências históricas de tipos/supressões. Inventários pequenos necessários à comparação ficam versionados em `tooling/migration/reference`; logs e builds ficam em `.artifacts`.

Não mover código, criar workspaces, instalar dependências ou corrigir regras de negócio nesta fase.

## 2. Contrato/Schema

Fixar os formatos dos inventários e das evidências antes de implementar seus geradores. Cada fonte precisa de caminho e hash; cada teste, arquivo e nome completo; cada ocorrência histórica, trecho e localização; cada processo, comando, estado final e código de saída.

O contrato do runner define P0–P6, predecessor obrigatório, conjunto fixo por fase e falha para processo interrompido, timeout, comando ausente ou resultado incompleto. As verificações específicas são implementadas na fase que as introduz; uma verificação ainda ausente nunca pode retornar sucesso.

O bootstrap usa `node:test`, já fornecido pelo Node, para validar o manifesto e as fixtures de contrato antes de escrever o runner. Validar campos obrigatórios, IDs, grafo sem ciclos, autorização de bibliotecas e sucesso exclusivamente com saída zero. O bootstrap não depende de `gate:migration` existir.

## 3. Teste

Criar `tooling/migration/tests/contracts.test.mjs` e executar:

```sh
node --test tooling/migration/tests/contracts.test.mjs
```

O teste deve aceitar o contrato desta etapa e rejeitar fixtures inválidas. Depois, escrever os testes adversos do runner/linter descritos em [quality gates](../quality-gates.md), demonstrando a reprovação do estado incorreto antes da implementação. Separar essa evidência do gate final.

Executar check, Vitest e build atuais e registrar o resultado real. Nos testes de datas, confirmar a causa de idioma/fuso observada anteriormente. Preparar fixtures explícitas de idioma e relógio, com restauração de estado, e configurar o fuso do processo de teste antes de iniciá-lo. Manter o idioma padrão do aplicativo.

## 4. Implementação mínima

- Implementar scripts em `tooling/migration`, com as dependências já declaradas, e os comandos de P0 na raiz.
- Registrar valores reais de `PERSISTENCE`, stores, índices, chaves e formatos; não aprovar apenas comparações de contagem.
- Corrigir a configuração determinística dos testes confirmada no passo anterior. Não mudar expectativas para acomodar regressões.
- Remover o mascaramento de erro de `prepare`; qualquer falha real de sincronização deve ser propagada.
- Ignorar os artefatos de execução no Git, preservando contratos, fixtures sintéticas e resumos versionados.

Não fabricar um resultado inicial verde. Se as falhas exigirem alterações de produto fora do recorte, aplicar Stop & Ask.

## 5. Quality Gate

```sh
npm run check:contracts -- --spec P0
npm run gate:migration -- P0
```

**Aceite:** ambos retornam zero; check, todos os testes existentes, build, contratos, linter e testes do árbitro aprovados. Nenhum teste desapareceu, foi ignorado ou teve suas asserções enfraquecidas. A referência registra as ferramentas e os arquivos efetivamente verificados.

**Auditoria:** provar que um subprocesso falho reprova o runner, que uma aresta proibida reprova o linter e que uma fixture com dado protegido alterado reprova o contrato. Confirmar que o inventário histórico não permite novos `any` ou supressões.

**Handoff:** registrar evidência e checkpoint em `state.md`. P1 só começa após P0 aprovado. Se bloqueado, registrar a causa e a pergunta pendente, sem movimentar fontes.
