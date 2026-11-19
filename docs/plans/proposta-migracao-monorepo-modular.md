# Proposta de migração do Notfeed para um monorepo modular

**Data:** 18 de novembro de 2026

**Atualização:** 19 de novembro de 2026

**Status:** Proposta arquitetural com etapas, fases e gates de validação. O detalhamento operacional será definido separadamente.

A proposta é reorganizar o `notfeed-app` em um monorepo limpo, com foco na web/PWA e em recuperar velocidade de desenvolvimento. O trabalho inicial compreende duas etapas: migração estrutural com os agrupamentos existentes e organização dos módulos por meio de refatorações. Etapas posteriores de refatorações mais profundas e novas funcionalidades ficam fora deste escopo.

O escopo deve permanecer enxuto: aproveitar a lógica atual onde o encaixe for simples e fazer apenas as adaptações necessárias para operar na nova estrutura. O uso maior de Rust e a eventual integração de bibliotecas C++ orientam a organização do repositório, sem acrescentar integrações agora.

## Problema atual

O repositório já separa domínio, ingestão, normalização, persistência e plataforma, mas essas camadas técnicas não estabelecem fronteiras suficientes entre funcionalidades. Regras e coordenação de negócio estão distribuídas entre stores reativos, serviços, componentes e módulos com muitas responsabilidades.

Alguns exemplos são a publicação de árvores dentro do store de Creator, a concentração de coordenação no PostManager e os acessos à persistência feitos diretamente por componentes. Essa organização dificulta alterar uma funcionalidade isoladamente e reutilizar suas regras em outro aplicativo.

A migração deve aproveitar os modelos, protocolos, normalizadores e adaptadores existentes onde isso for viável. Resolver profundamente todos os acoplamentos internos antes de retomar o desenvolvimento prolongaria a migração e poderia antecipar decisões sobre regras que serão alteradas depois.

## Modelo proposto

Adotar um **monorepo preparado para múltiplas linguagens**, mantendo o código atual agrupado e estabelecendo apenas as separações necessárias para organizar e executar os aplicativos existentes. O monólito modular permanece como direção de evolução; a divisão do negócio em módulos será definida na etapa 2.

O monorepo reúne aplicativos e bibliotecas no mesmo repositório, mantendo a execução local e o funcionamento offline, sem exigir um backend próprio. Nesta migração, é aceitável manter toda a lógica atual em um único pacote, respeitando sua organização interna existente.

Os contratos e adaptadores existentes podem ser mantidos. A criação de novas interfaces, camadas ou APIs por domínio não é uma condição para concluir a migração.

## Organização do repositório

Estrutura proposta para acomodar o código existente:

```text
notfeed-app/
├── apps/
│   ├── web/                 # SvelteKit, rotas, interface, PWA e service worker
│   └── desktop/             # Aplicação Tauri existente, incluindo seu Rust
├── packages/
│   └── notfeed/             # Código atual do produto, com seus agrupamentos existentes
├── tooling/                 # Configurações e verificações comuns
└── docs/                    # Documentação do projeto
```

O desktop continua aproveitando a interface web existente. O aplicativo Tauri mantém sua inicialização, seu Rust e os recursos específicos do executável. As integrações atuais não precisam virar pacotes de adaptadores separados.

A árvore representa um ponto de partida com um único pacote para o código do produto. Pastas como `domain`, `stores`, `services`, `ingestion`, `normalization`, `persistence`, `platform` e `components` podem manter seus agrupamentos atuais. O pacote pode conter código Svelte e dependências de plataforma; torná-lo um núcleo totalmente independente fica fora do escopo atual.

Se mover uma parte para esse pacote exigir uma refatoração extensa, ela pode permanecer no aplicativo. Não devem ser criados pacotes vazios ou divisões adicionais apenas para preencher uma estrutura idealizada.

## Profundidade da modularização atual

A migração não define novos módulos de negócio. As divisões anteriormente sugeridas, como identidade, conteúdo, biblioteca, leitura, ingestão e notificações, deixam de orientar a organização desta etapa.

Devem ser mantidos os agrupamentos que já existem ou reunidos em um único pacote quando isso simplificar a migração. A movimentação de código não exige redefinir responsabilidades de negócio ou distribuir os dados entre novos módulos.

Stores, serviços e o PostManager podem continuar com suas responsabilidades atuais. Os ajustes agora se limitam ao que for necessário para o código funcionar na nova localização e com a configuração do workspace. O banco IndexedDB e o schema atuais podem permanecer.

## Migração limpa sem camadas de legado

A nova estrutura passa a ser a única organização ativa do produto. Ao mover uma implementação, seus consumidores e configurações passam a utilizar o novo destino.

- Não criar pastas `legacy`, cópias da aplicação antiga ou implementações paralelas da mesma funcionalidade.
- Não manter aliases, reexports ou wrappers cuja única finalidade seja preservar os caminhos e a organização anteriores.
- Remover código e configuração substituídos quando deixarem de ter consumidores.
- Manter adaptadores que representam diferenças reais de plataforma, com responsabilidade própria.

Reaproveitar uma implementação existente não a transforma em uma camada de legado. Ela continua sendo a implementação ativa no aplicativo ou no pacote do produto. Quando uma adaptação necessária ficar mais complexa que uma solução direta, cabe simplificar o trecho envolvido, sem iniciar uma refatoração ampla.

## Regras de dependência

- Os aplicativos consomem os pacotes extraídos, que declaram suas dependências no workspace.
- Imports e configurações passam a apontar para a nova localização ativa do código.
- Quando uma dependência impedir uma separação simples, o código permanece junto, evitando criar ciclos entre pacotes ou forçar novas abstrações.
- Verificações de dependências se limitam às fronteiras efetivamente criadas, sem exigir uma reorganização interna por domínio.

Não se exige que todos os acessos à persistência passem por novos casos de uso, que os stores contenham apenas estado visual ou que o código atual se torne independente do framework. Essas decisões pertencem à refatoração posterior.

## Base para múltiplas linguagens

A organização de `apps/` e `packages/` deve comportar código JS/TS, Rust ou C++, com as ferramentas de cada ecossistema coordenadas pelos comandos do repositório quando houver necessidade. Essa capacidade não depende de definir os módulos de negócio agora.

Na migração atual, o TypeScript permanece em TypeScript e o Rust existente permanece integrado ao Tauri. A organização não pressupõe troca de gerenciador de pacotes nem adoção de uma ferramenta específica de orquestração.

Futuras bibliotecas poderão ser encapsuladas por adaptadores ou substituir implementações internas, preservando os contratos dos consumidores quando possível. A compatibilidade de cada biblioteca com web, desktop ou mobile e suas pontes de integração será avaliada nesse momento.

A intenção é permitir esses ajustes dentro da estrutura modular, reduzindo a necessidade de outra reorganização geral. Não há inclusão antecipada de WebAssembly, bindings, toolchains C++, pacotes vazios ou aplicativos futuros.

## Escopo da etapa 1

A migração abrange a organização do workspace, a movimentação do código existente e as adaptações necessárias para executá-lo na nova estrutura. Inclui ajustes de imports, configuração, build, testes e documentação, além da remoção das estruturas substituídas.

O comportamento útil do produto e sua lógica devem ser preservados onde isso for plausível, sem exigir uma refatoração extensa para reproduzir todos os detalhes internos. Simplificações que afetem o comportamento devem ter seu impacto explicitado. Os dados locais, identificadores e formatos de importação e exportação continuam sendo referências de compatibilidade; a reorganização não deve provocar apagamento do banco.

Ficam fora da etapa 1 a definição de novos módulos de negócio e a refatoração interna para esses limites. Novas regras, novos aplicativos, novas bibliotecas Rust/C++, WebAssembly, substituição do IndexedDB, criação de backend e expansão das plataformas suportadas ficam fora das duas etapas iniciais.

## Etapas e fases do trabalho inicial

Cada etapa é dividida em fases de escopo delimitado. Os gates são critérios objetivos de entrada e saída, verificados antes de avançar. As fases abaixo estabelecem os resultados esperados; tarefas, comandos e alterações por arquivo pertencem ao detalhamento operacional.

### Etapa 1 Migração estrutural

Entregar o produto na nova organização do repositório, mantendo os agrupamentos existentes ou um único pacote para o código atual. A conclusão desta etapa independe da definição dos módulos de negócio.

| Fase | Escopo | Gate de saída |
| --- | --- | --- |
| 1.1 Referência inicial | Registrar o estado do código, os resultados de build, tipagem e testes, os fluxos essenciais e as falhas preexistentes. | Referência reproduzível com verificações obrigatórias retornando zero; correção fora do escopo exige consulta antes de avançar. |
| 1.2 Workspace e movimentação | Organizar os aplicativos e o código atual, ajustando dependências, imports e configurações. | Desenvolvimento, build, tipagem e testes pertinentes aprovados com saída zero; uma única implementação ativa. |
| 1.3 Integrações existentes | Verificar os caminhos de assets e rotas, o service worker, o armazenamento local e a integração com o Tauri após a movimentação. | Fluxos afetados validados em execução, dados preservados e nenhuma regressão introduzida pela mudança de estrutura. |
| 1.4 Consolidação | Remover estruturas substituídas, atualizar a documentação e verificar o conjunto dos aplicativos existentes. | Gate de encerramento da etapa aprovado e checkpoint de referência da nova estrutura registrado. |

### Etapa 2 Organização modular

Definir com o usuário os módulos que fazem sentido para o produto e realizar as refatorações necessárias para organizar responsabilidades e dependências. As regras e a visão do produto orientam esses limites, sem antecipar novas funcionalidades ou revisões funcionais profundas.

| Fase | Escopo | Gate de saída |
| --- | --- | --- |
| 2.1 Definição dos módulos | Estabelecer com o usuário as responsabilidades, os limites, os contratos e as dependências pretendidos. | Organização acordada antes de iniciar a extração; nenhuma lista de módulos é imposta pela etapa 1. |
| 2.2 Refatoração por módulo | Reorganizar uma unidade delimitada por vez conforme a definição acordada, mantendo uma única implementação ativa. | Build, tipagem, testes do comportamento afetado e verificações de dependências aprovados para a unidade alterada. |
| 2.3 Consolidação modular | Validar as integrações entre módulos, remover estruturas substituídas e atualizar a documentação. | Gate de encerramento da etapa aprovado, com responsabilidades implementadas e fronteiras verificáveis. |

A fase 2.2 pode conter várias fases menores conforme os módulos definidos. Cada uma passa por seu próprio gate, evitando acumular refatorações extensas antes de verificar o resultado.

### Etapas posteriores

Refatorações mais profundas, alterações amplas das regras de negócio, novas funcionalidades e expansão das tecnologias serão tratadas depois, com escopo próprio. O trabalho inicial se encerra com a migração estrutural e a organização modular validadas.

## Processo de gates e testes

Cada fase deve registrar de forma breve:

- Estado de entrada e checkpoint de referência.
- Mudança delimitada, resultado esperado e comportamentos que precisam continuar funcionando.
- Verificações exigidas e seus resultados.
- Estado de saída, eventuais limitações e checkpoint para recuperação.

Os gates técnicos não exigem confirmação manual a cada fase. A decisão sobre quais módulos existirão pertence à fase 2.1 e deve ser alinhada com o usuário antes da refatoração correspondente.

### Critérios para avançar

Uma fase avança quando todas as verificações obrigatórias retornarem zero. Regressões introduzidas devem ser resolvidas antes de acumular outras alterações. Falhas preexistentes são registradas e não recebem aprovação por serem antigas. Quando sua correção ultrapassar o escopo estrutural ou a configuração de testes, o protocolo exige consulta antes de avançar.

Uma verificação obrigatória que não pôde ser executada fica pendente, com o motivo registrado. Ela não conta como aprovada. Simplificações que alterem comportamento devem ter o impacto registrado, sem redefinir o resultado esperado apenas para fazer um teste passar.

### Verificação proporcional ao impacto

Durante cada fase, executar build, tipagem e testes pertinentes aos aplicativos, pacotes e fluxos afetados. Novos testes devem proteger comportamentos relevantes ou fronteiras que a mudança possa comprometer, evitando testes que apenas reproduzam a estrutura do código.

No encerramento de cada etapa, verificar o conjunto dos builds e testes aplicáveis e os fluxos essenciais de importação, ativação, leitura, publicação, troca de usuário e uso offline, incluindo a preservação dos dados locais. As validações devem considerar os ambientes reais envolvidos, especialmente navegador, service worker e Tauri.

A verificação completa também se aplica a mudanças que afetem o conjunto do produto. Não é necessário repeti-la a cada movimentação pequena quando as verificações pertinentes já cobrem o impacto e não surgiram novos problemas.

### Recuperação sem legado

Checkpoints no Git permitem retornar a um estado validado quando necessário. A recuperação utiliza o histórico do repositório; não mantém cópias antigas, pastas `legacy` ou implementações paralelas dentro da aplicação.

## Resultado esperado

O produto deve continuar utilizável na web/PWA e no desktop atual. Build, tipagem, testes e os fluxos essenciais existentes servem para verificar a nova organização e identificar regressões, considerando os problemas preexistentes e eventuais simplificações explicitadas.

A etapa 1 entrega uma única estrutura ativa, com o workspace funcionando, os aplicativos existentes integrados e o código organizado conforme os agrupamentos atuais, podendo permanecer em um único pacote. A etapa 2 entrega os módulos acordados, com suas responsabilidades implementadas e dependências verificáveis. Ambas preservam a ausência de camadas para sustentar a organização substituída.

O [plano de engenharia da etapa 1](etapa-1-migracao-estrutural/README.md) detalha invariantes, contratos, fases P0–P6, comandos de gate, estado vivo e ADRs segundo o protocolo Meta-Harness. Playwright está previsto somente para desenvolvimento, conforme autorização do usuário. A execução da migração não foi iniciada. A etapa 2 será detalhada depois, com os módulos definidos em conjunto.
