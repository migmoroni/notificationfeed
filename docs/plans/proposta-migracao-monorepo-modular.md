# Proposta de migração do Notfeed para um monorepo modular

**Data:** 18 de novembro de 2026

**Atualização:** 20 de novembro de 2026

**Status:** Etapa 1 concluída. Etapa 2 com plano de engenharia preparado, execução não iniciada. Etapa 3 proposta, com detalhamento próprio posterior.

A proposta é reorganizar o `notfeed-app` em um monorepo limpo, com foco na web/PWA e em recuperar velocidade de desenvolvimento. O trabalho inicial compreende três etapas: migração estrutural com os agrupamentos existentes; manutenção da base técnica e padronização do ambiente de desenvolvimento; organização dos módulos por meio de refatorações. Etapas posteriores de refatorações mais profundas e novas funcionalidades ficam fora deste escopo.

O escopo deve permanecer enxuto: aproveitar a lógica atual onde o encaixe for simples e fazer as adaptações necessárias ao objetivo de cada etapa. O uso maior de Rust e a eventual integração de bibliotecas C++ orientam a organização do repositório, sem acrescentar integrações agora.

## Problema atual

O repositório já separa domínio, ingestão, normalização, persistência e plataforma, mas essas camadas técnicas não estabelecem fronteiras suficientes entre funcionalidades. Regras e coordenação de negócio estão distribuídas entre stores reativos, serviços, componentes e módulos com muitas responsabilidades.

Alguns exemplos são a publicação de árvores dentro do store de Creator, a concentração de coordenação no PostManager e os acessos à persistência feitos diretamente por componentes. Essa organização dificulta alterar uma funcionalidade isoladamente e reutilizar suas regras em outro aplicativo.

A migração deve aproveitar os modelos, protocolos, normalizadores e adaptadores existentes onde isso for viável. Resolver profundamente todos os acoplamentos internos antes de retomar o desenvolvimento prolongaria a migração e poderia antecipar decisões sobre regras que serão alteradas depois.

## Modelo proposto

Adotar um **monorepo preparado para múltiplas linguagens**, mantendo o código atual agrupado e estabelecendo apenas as separações necessárias para organizar e executar os aplicativos existentes. O monólito modular permanece como direção de evolução; a divisão do negócio em módulos será definida na etapa 3.

O monorepo reúne aplicativos e bibliotecas no mesmo repositório, mantendo a execução local e o funcionamento offline, sem exigir um backend próprio. Nesta migração, é aceitável manter toda a lógica atual em um único pacote, respeitando sua organização interna existente.

Os contratos e adaptadores existentes podem ser mantidos. A criação de novas interfaces, camadas ou APIs por domínio não é uma condição para concluir a migração.

## Organização do repositório

Estrutura implantada na etapa 1 e preservada durante a manutenção da base técnica na etapa 2:

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

A migração estrutural e a manutenção da base técnica não definem novos módulos de negócio. As divisões anteriormente sugeridas, como identidade, conteúdo, biblioteca, leitura, ingestão e notificações, não orientam a organização dessas etapas. Os limites serão acordados na etapa 3.

Devem ser mantidos os agrupamentos que já existem ou reunidos em um único pacote quando isso simplificar a migração. A movimentação de código não exige redefinir responsabilidades de negócio ou distribuir os dados entre novos módulos.

Stores, serviços e o PostManager podem continuar com suas responsabilidades atuais até a etapa 3. Na etapa 1, os ajustes se limitaram ao funcionamento na nova localização e às correções pontuais autorizadas. A etapa 2 admite adaptações necessárias à atualização das ferramentas e dependências, preservando comportamento, dados locais e schema do IndexedDB.

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

Na etapa 1, o TypeScript permaneceu em TypeScript, o Rust existente continuou integrado ao Tauri e o workspace foi organizado com npm. A etapa 2 prevê a migração para pnpm no ecossistema JS/TS, mantendo Cargo para o Rust existente. Essa escolha não exige outra organização de diretórios nem a adoção de uma ferramenta adicional de orquestração.

Futuras bibliotecas poderão ser encapsuladas por adaptadores ou substituir implementações internas, preservando os contratos dos consumidores quando possível. A compatibilidade de cada biblioteca com web, desktop ou mobile e suas pontes de integração será avaliada nesse momento.

A intenção é permitir esses ajustes dentro da estrutura modular, reduzindo a necessidade de outra reorganização geral. Não há inclusão antecipada de WebAssembly, bindings, toolchains C++, pacotes vazios ou aplicativos futuros.

## Escopo da etapa 1

A migração abrange a organização do workspace, a movimentação do código existente e as adaptações necessárias para executá-lo na nova estrutura. Inclui ajustes de imports, configuração, build, testes e documentação, além da remoção das estruturas substituídas.

O comportamento útil do produto e sua lógica devem ser preservados onde isso for plausível, sem exigir uma refatoração extensa para reproduzir todos os detalhes internos. Simplificações que afetem o comportamento devem ter seu impacto explicitado. Os dados locais, identificadores e formatos de importação e exportação continuam sendo referências de compatibilidade; a reorganização não deve provocar apagamento do banco.

Ficam fora da etapa 1 a definição de novos módulos de negócio e a refatoração interna para esses limites. Novas regras, novos aplicativos, reescritas ou novas integrações Rust/C++, WebAssembly, substituição do IndexedDB, criação de backend e expansão das plataformas suportadas ficam fora das três etapas iniciais. A manutenção das dependências Rust já utilizadas pelo Tauri faz parte da etapa 2.

## Escopo da etapa 2

Estabilizar a base técnica e tornar previsível o ciclo de editar, executar e validar antes da refatoração modular: auditar dependências JS/TS e Rust existentes, migrar npm para pnpm, atualizar bibliotecas e ferramentas em grupos compatíveis e padronizar o ambiente de desenvolvimento. A auditoria distingue exposição na web/PWA, no desktop e no ambiente de desenvolvimento; alertas do gerenciador precisam ser avaliados no contexto de uso. Correções de riscos relevantes que não possam aguardar têm prioridade sobre a troca de gerenciador.

A migração para pnpm constitui uma fase própria. Deve partir do lockfile atual, comparar as versões resolvidas e justificar qualquer diferença, sem acumular atualizações deliberadas de bibliotecas nessa mesma fase. Inclui configuração dos workspaces, dependências internas, versão do gerenciador, scripts, instalação reproduzível, comandos Tauri, verificações automatizadas e documentação. Ao final, haverá um único lockfile ativo para JS/TS, além do `Cargo.lock` existente.

As atualizações seguintes priorizam segurança e versões mantidas, com adaptações mínimas de compatibilidade. Não se exige colocar todas as bibliotecas na versão mais recente. Atualizações de versão principal entram nesta etapa quando necessárias para segurança, suporte ou preparação da modularização. Substituições e atualizações que exijam redesenho amplo, sem essa necessidade, ficam para etapas posteriores. Tauri e seus plugins devem ser avaliados em conjunto nos lados JS e Rust.

Os contratos da etapa 2 devem distinguir as provas históricas da migração das verificações permanentes de arquitetura e comportamento. As evidências aprovadas da etapa 1 permanecem preservadas; os novos contratos passam a representar pnpm e as versões selecionadas, mantendo tipos estritos, cobertura de testes, fronteiras, preservação de dados e validação PWA/desktop. Não se deve relaxar verificações apenas para aceitar a troca de ferramentas.

Esta etapa não reorganiza módulos de negócio nem acrescenta plataformas ou integrações futuras. Seu encerramento entrega uma referência validada para iniciar a refatoração da etapa 3.

### Ambiente de desenvolvimento e verificações permanentes

Manter SvelteKit/Vite com HMR, Vitest, Playwright e Tauri/Cargo como base, atualizando suas versões conforme os grupos de compatibilidade. A padronização deve atender ao desenvolvimento web/PWA e ao desktop existente, sem antecipar ferramentas para plataformas futuras.

Debian 13 (trixie), Linux x86_64, é a referência de desenvolvimento local definida pelo usuário. A preparação das bibliotecas de sistema deve ser documentada e validada nessa base. O mise foi incluído no plano como [unidade 2.5f de provisionamento](etapa-2-base-tecnica-e-ambiente/fases/2.5f-provisionamento-com-mise.md), com contratos, provas e gates próprios. Ferramentas são instaladas por usuário fora do repositório e selecionadas por projeto; manter versões exatas, sem alterar defaults globais. Setup web e desktop são separados, preservando pnpm/Cargo/rustup e os comandos atuais. O desenvolvimento local permanece sem exigir Docker; uma eventual adoção futura deverá usar uma imagem Debian com versão e identidade fixadas.

A CI mantém Ubuntu 24.04 nos runners hospedados do GitHub, conforme decisão do usuário. Desenvolvimento Debian 13 e CI Ubuntu compartilham as versões exatas das ferramentas e os comandos de validação; as bibliotecas de sistema são preparadas conforme cada distribuição. A CI valida o projeto em Ubuntu e complementa as provas locais em Debian, sem constituir prova de execução em Debian 13 ou de bibliotecas de sistema idênticas. Não introduzir Docker ou runner próprio nesta etapa. A compatibilidade do AppImage com distribuições mais antigas depende de validação específica. A decisão está registrada na [ADR 016](etapa-2-base-tecnica-e-ambiente/adr/016-debian-13-como-referencia-local.md).

| Frente                  | Resultado previsto na etapa 2                                                                                                                                                                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Versões e instalação    | Fixar versões de referência compatíveis e mantidas de Node, pnpm e Rust, incluindo `rust-toolchain.toml`; alinhar `@types/node` ao runtime escolhido. Usar as mesmas versões no ambiente local e na CI, com lockfiles respeitados e navegador Playwright correspondente à versão adotada.                      |
| Lint e formatação       | Adotar ESLint com suporte a TypeScript/Svelte e Prettier como dependências de desenvolvimento; incorporar `rustfmt` e Clippy para o Rust existente. Definir regras e cobertura antes da aplicação, mantendo alterações de formatação isoladas das mudanças funcionais.                                         |
| Comandos cotidianos     | Disponibilizar comandos da raiz para desenvolvimento, tipos, lint, verificação de formatação, testes e fronteiras, além de uma verificação rápida agregada. As verificações permanentes devem funcionar sem depender da cadeia de fases ou dos hashes de preservação da migração histórica.                    |
| Consistência dos testes | Unificar as condições de execução em watch e em lote, incluindo UTC e controle de idioma quando pertinente. Manter dados sintéticos e cenários locais reproduzíveis para os fluxos de navegador, sem depender de feeds externos para provar comportamento.                                                     |
| Servidores e PWA        | Definir portas previsíveis para desenvolvimento, preview e testes, alinhadas ao `devUrl` do Tauri, com falha explícita em caso de ocupação. Manter HMR no desenvolvimento e validar service worker/offline no build servido localmente, com comando documentado e perfis de teste isolados dos dados pessoais. |
| Preparação do ambiente  | Consolidar instruções e fornecer um comando de diagnóstico dos pré-requisitos, com mensagens acionáveis e saída diferente de zero quando faltar um requisito do alvo escolhido. O desenvolvimento web não deve exigir a instalação das dependências nativas do desktop.                                        |
| Integração contínua     | Automatizar a instalação reproduzível e os checks em alterações propostas, usando os mesmos comandos locais. Executar verificações rápidas primeiro e testes completos de PWA/desktop conforme critérios de impacto definidos previamente; publicar resultados e evidências de falhas.                         |

A adoção de lint e formatação deve ter escopo delimitado, sem converter esta etapa em uma refatoração geral do produto. As regras acordadas precisam passar sem supressões ou redução de cobertura para obter aprovação. Problemas cuja correção ultrapasse o recorte autorizado acionam o protocolo de consulta. Bibliotecas de suporte dessas ferramentas e suas versões serão declaradas no plano de engenharia antes da instalação.

O fluxo cotidiano combina tipos, lint, formatação, testes pertinentes e fronteiras. A validação de integração acrescenta build, navegador real, atualização/offline da PWA, preservação dos dados e verificações nativas aplicáveis. Mudanças em dependências, configuração ou código compartilhado exigem validação dos consumidores afetados; o encerramento da etapa exige o conjunto completo, mesmo quando os checks cotidianos forem menores. Formatação e lint Rust complementam compilação e testes, sem representar cobertura E2E da interface nativa.

A adoção do mise mantém os pins já aprovados, acrescenta bootstrap verificável sem Node global e mise.toml/mise.lock e substitui a preparação manual concorrente. O aceite exige checkout limpo, seleção correta mesmo com ferramentas globais diferentes, execução não interativa e reexecução sem alterar locks. Após essa unidade, revalidar o fechamento 2.5 e a configuração 2.6, antes da prova CI real e da consolidação. O mise ainda não está implementado.

## Etapas e fases do trabalho inicial

Cada etapa é dividida em fases de escopo delimitado. Os gates são critérios objetivos de entrada e saída, verificados antes de avançar. As fases abaixo estabelecem os resultados esperados; tarefas, comandos e alterações por arquivo pertencem ao detalhamento operacional.

O detalhamento de cada fase segue o ciclo Especificação → Contrato/Schema → Teste → Implementação Mínima → Quality Gate. Os planos de engenharia definem os comandos de terminal, o `state.md` e os ADRs correspondentes antes da execução.

### Etapa 1 Migração estrutural

Etapa concluída, com as fases operacionais P0–P6 aprovadas conforme o [estado vivo da etapa 1](etapa-1-migracao-estrutural/state.md). O produto foi entregue na nova organização do repositório, mantendo os agrupamentos existentes no pacote único. Sua conclusão independeu da definição dos módulos de negócio. As fases abaixo resumem o escopo executado.

| Fase                         | Escopo                                                                                                                           | Gate de saída                                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 Referência inicial       | Registrar o estado do código, os resultados de build, tipagem e testes, os fluxos essenciais e as falhas preexistentes.          | Referência reproduzível com verificações obrigatórias retornando zero; correção fora do escopo exige consulta antes de avançar. |
| 1.2 Workspace e movimentação | Organizar os aplicativos e o código atual, ajustando dependências, imports e configurações.                                      | Desenvolvimento, build, tipagem e testes pertinentes aprovados com saída zero; uma única implementação ativa.                   |
| 1.3 Integrações existentes   | Verificar os caminhos de assets e rotas, o service worker, o armazenamento local e a integração com o Tauri após a movimentação. | Fluxos afetados validados em execução, dados preservados e nenhuma regressão introduzida pela mudança de estrutura.             |
| 1.4 Consolidação             | Remover estruturas substituídas, atualizar a documentação e verificar o conjunto dos aplicativos existentes.                     | Gate de encerramento da etapa aprovado e checkpoint de referência da nova estrutura registrado.                                 |

### Etapa 2 Manutenção da base técnica e ambiente de desenvolvimento

Preparar ferramentas, dependências e a rotina de desenvolvimento para a organização modular, preservando a estrutura e o comportamento validados na etapa 1. A troca de gerenciador, as atualizações e a padronização dos checks passam por gates separados para permitir identificar a causa de uma regressão.

| Fase                                    | Escopo                                                                                                                                                                               | Gate de saída                                                                                                                                                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2.1 Diagnóstico e contratos             | Inventariar versões, suporte, alertas JS/Rust, exposição efetiva e lacunas do ambiente; definir grupos de atualização, ferramentas, regras, contratos e critérios de execução na CI. | Inventário e classificação verificáveis, contratos validados com saída zero e referência funcional registrada; nenhum alerta descartado apenas por ser preexistente.                                                                                               |
| 2.2 Correções prioritárias              | Tratar riscos relevantes que não possam aguardar a migração para pnpm, com mudanças delimitadas.                                                                                     | Auditoria confirma a remoção ou mitigação validada dos riscos selecionados e testes afetados retornam zero. Se não houver correção urgente, a classificação da fase 2.1 deve demonstrar isso.                                                                      |
| 2.3 Migração para pnpm                  | Migrar workspace, lockfile, instalação, scripts, comandos Tauri e verificações, comparando as versões resolvidas.                                                                    | Instalação limpa com lockfile congelado, dependências internas resolvidas localmente e verificações de tipos, testes, build e integrações afetadas com saída zero.                                                                                                 |
| 2.4 Atualizações por grupo              | Atualizar dependências e ferramentas em conjuntos compatíveis, incluindo o Rust existente; fixar as versões de referência e alinhar os tipos ao runtime.                             | Para cada grupo, auditoria comparada à entrada, critérios de segurança atendidos e verificações do comportamento afetado retornando zero antes do próximo grupo.                                                                                                   |
| 2.5 Ambiente e verificações permanentes | Configurar lint/formatação, comandos, testes, PWA e diagnóstico; separar checks permanentes do histórico e acrescentar provisionamento mise por alvo.                                | Instalação limpa e seleção das versões por projeto, locks preservados, diagnóstico, tipos, lint, testes, fronteiras e consumidores aprovados; incluir provas adversas do provisionamento.                                                                          |
| 2.6 Integração contínua                 | Automatizar os comandos validados em alterações propostas, com instalação limpa, verificações por impacto e registro de evidências.                                                  | Execução real da CI com checks obrigatórios aprovados, versões e comandos equivalentes aos locais e nenhuma verificação exigida omitida; configuração criada sem execução não conta como aprovação.                                                                |
| 2.7 Consolidação técnica                | Validar o conjunto, concluir a documentação de preparação e desenvolvimento e registrar a referência para a etapa 3.                                                                 | Gate completo aprovado, incluindo instalação reproduzível, diagnóstico, tipos, lint, formatação, testes, fronteiras, PWA com preservação de dados, build/empacotamento desktop e CI; nenhum risco bloqueante pendente conforme os critérios definidos na fase 2.1. |

As fases 2.4 e 2.5 devem ser divididas em unidades menores conforme os grupos e ajustes identificados no diagnóstico, cada uma com seu ciclo de contrato, teste, implementação e gate. Os critérios de segurança são definidos antes das correções, sem alterar limites ou suprimir alertas para obter aprovação. Qualquer risco residual deve ter justificativa verificável; um risco bloqueante não pode ser convertido em aprovação por mera documentação.

### Etapa 3 Organização modular

Definir com o usuário os módulos que fazem sentido para o produto e realizar as refatorações necessárias para organizar responsabilidades e dependências. As regras e a visão do produto orientam esses limites, sem antecipar novas funcionalidades ou revisões funcionais profundas.

| Fase                       | Escopo                                                                                                            | Gate de saída                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 3.1 Definição dos módulos  | Estabelecer com o usuário as responsabilidades, os limites, os contratos e as dependências pretendidos.           | Organização acordada antes de iniciar a extração; nenhuma lista de módulos é imposta pelas etapas anteriores.     |
| 3.2 Refatoração por módulo | Reorganizar uma unidade delimitada por vez conforme a definição acordada, mantendo uma única implementação ativa. | Build, tipagem, testes do comportamento afetado e verificações de dependências aprovados para a unidade alterada. |
| 3.3 Consolidação modular   | Validar as integrações entre módulos, remover estruturas substituídas e atualizar a documentação.                 | Gate de encerramento da etapa aprovado, com responsabilidades implementadas e fronteiras verificáveis.            |

A definição dos módulos pode avançar durante a manutenção técnica, mas a refatoração da fase 3.2 começa após a aprovação da etapa 2 e dos contratos da fase 3.1. A fase 3.2 pode conter várias fases menores conforme os módulos definidos. Cada uma passa por seu próprio gate, evitando acumular refatorações extensas antes de verificar o resultado.

### Etapas posteriores

Refatorações mais profundas, alterações amplas das regras de negócio, novas funcionalidades e expansão das tecnologias serão tratadas após a etapa 3, com escopo próprio. O trabalho inicial se encerra com a migração estrutural, a manutenção da base técnica e a organização modular validadas.

## Processo de gates e testes

Cada fase deve registrar de forma breve:

- Estado de entrada e checkpoint de referência.
- Mudança delimitada, resultado esperado e comportamentos que precisam continuar funcionando.
- Verificações exigidas e seus resultados.
- Estado de saída, eventuais limitações e checkpoint para recuperação.

Os gates técnicos não exigem confirmação manual a cada fase. A decisão sobre quais módulos existirão pertence à fase 3.1 e deve ser alinhada com o usuário antes da refatoração correspondente.

### Critérios para avançar

Uma fase avança quando todas as verificações obrigatórias retornarem zero. Regressões introduzidas devem ser resolvidas antes de acumular outras alterações. Falhas preexistentes são registradas e não recebem aprovação por serem antigas. Quando sua correção ultrapassar o escopo autorizado da fase, o protocolo exige consulta antes de avançar.

Uma verificação obrigatória que não pôde ser executada fica pendente, com o motivo registrado. Ela não conta como aprovada. Simplificações que alterem comportamento devem ter o impacto registrado, sem redefinir o resultado esperado apenas para fazer um teste passar.

### Verificação proporcional ao impacto

Durante cada fase, executar build, tipagem e testes pertinentes aos aplicativos, pacotes e fluxos afetados. Novos testes devem proteger comportamentos relevantes ou fronteiras que a mudança possa comprometer, evitando testes que apenas reproduzam a estrutura do código.

No encerramento de cada etapa, verificar o conjunto dos builds e testes aplicáveis e os fluxos essenciais de importação, ativação, leitura, publicação, troca de usuário e uso offline, incluindo a preservação dos dados locais. As validações devem considerar os ambientes reais envolvidos, especialmente navegador, service worker e Tauri.

A verificação completa também se aplica a mudanças que afetem o conjunto do produto. Não é necessário repeti-la a cada movimentação pequena quando as verificações pertinentes já cobrem o impacto e não surgiram novos problemas.

### Recuperação sem legado

Checkpoints no Git permitem retornar a um estado validado quando necessário. A recuperação utiliza o histórico do repositório; não mantém cópias antigas, pastas `legacy` ou implementações paralelas dentro da aplicação.

## Resultado esperado

O produto deve continuar utilizável na web/PWA e no desktop atual. Build, tipagem, testes e os fluxos essenciais existentes servem para verificar a nova organização e identificar regressões, considerando os problemas preexistentes e eventuais simplificações explicitadas.

A etapa 1 entregou uma única estrutura ativa, com o workspace funcionando, os aplicativos existentes integrados e o código organizado conforme os agrupamentos atuais no pacote único. A etapa 2 entrega essa base com pnpm, dependências revisadas, correções de segurança, ambiente reproduzível, comandos cotidianos padronizados e verificações permanentes executadas localmente e na CI. A etapa 3 entrega os módulos acordados, com suas responsabilidades implementadas e dependências verificáveis. As três etapas preservam a ausência de camadas para sustentar a organização substituída.

O [plano de engenharia da etapa 1](etapa-1-migracao-estrutural/README.md) registra invariantes, contratos, fases P0–P6, comandos de gate, estado vivo e ADRs segundo o protocolo Meta-Harness. Sua execução está concluída; Playwright foi incorporado somente para desenvolvimento, conforme autorização do usuário. O [plano de engenharia da etapa 2](etapa-2-base-tecnica-e-ambiente/README.md) detalha a manutenção da base técnica e a padronização do ambiente, com fases 2.1–2.7, unidades atômicas, contratos, gates, estado vivo e ADRs. Sua execução está em andamento; o [estado vivo](etapa-2-base-tecnica-e-ambiente/state.md) distingue aprovações anteriores, a ampliação mise planejada e as pendências de CI/consolidação. A organização modular passa a ser a etapa 3 nesta proposta; referências anteriores à etapa 2 nos registros da migração estrutural correspondem à numeração original e não autorizam antecipar essa refatoração.
