# Quality gates e evidências

## Árbitro e critério de sucesso

O árbitro é um comando reproduzível que compara a entrega com contratos fixados antes da implementação. Ele não avalia a intenção do Builder e não aceita justificativa textual no lugar de uma verificação.

**Todos os comandos e testes obrigatórios precisam retornar zero.** Uma referência com testes falhos não autoriza avançar. P0 corrige a causa das falhas de configuração conhecidas; uma correção que exija mudar o produto além do escopo aciona Stop & Ask. A regra é mais estrita que a mera comparação de quantidade de falhas.

Os comandos desta página foram implementados ao executar as fases. A existência de um comando não significa aprovação do gate; os resultados reais e checkpoints estão em [state.md](state.md).

## Interface dos comandos

Executar sempre a partir da raiz `notfeed-app`, usando Node/npm registrados na referência.

| Comando | Responsabilidade |
| --- | --- |
| `npm run check:contracts -- --spec Pn` | Validar a especificação da fase, seu predecessor, entradas e critérios, antes de alterar o produto. Não exige que os destinos futuros já existam. |
| `npm run check:contracts -- --realized Pn` | Comparar os arquivos e artefatos reais com o estado esperado ao final da fase. |
| `npm run lint:architecture -- --phase Pn` | Validar caminhos, arestas, exports, ausência de pontes antigas e restrições negativas aplicáveis à fase. |
| `npm run test:gate` | Exercitar o árbitro e o linter com fixtures válidas e inválidas. |
| `npm run check` | Verificar TypeScript/Svelte estritos, incluindo todo o código movido. |
| `npm run test:run` | Executar a suíte Vitest sem watch, preservando a descoberta dos testes existentes. |
| `npm run build` | Produzir o build web de produção. |
| `npm run test:e2e -- --project=chromium` | Executar os contratos de navegador com Playwright local e fixado no lockfile. |
| `npm run gate:migration -- Pn` | Executar o conjunto fixo da fase, verificar o predecessor e emitir evidências. |

`Pn` é um ID P0–P6, não uma opção de tolerância. A fase define explicitamente a topologia esperada: original em P0/P1, aplicativos em P2 e pacote em P3–P6. O gate de P6 jamais pode validar a topologia de P0. A evidência deve conter o ID e a versão dos contratos usados.

## Conjuntos obrigatórios por fase

Todos incluem contrato realizado, linter de arquitetura e testes do árbitro. Os demais checks são:

| Gate | Checks adicionais |
| --- | --- |
| P0 | `npm run check`, `npm run test:run`, `npm run build`; inventário de ferramentas, fontes, testes e dependências. |
| P1 | Check e Vitest; build; Playwright contra o build atual; checks de tipos da infraestrutura de testes. |
| P2 | Check, Vitest, build; smoke web/PWA de P1; `cargo metadata --locked --no-deps --format-version 1 --manifest-path apps/desktop/src-tauri/Cargo.toml`; contratos de caminhos do Tauri. |
| P3 | Check abrangendo pacote inteiro, Vitest com identidades conservadas, build incluindo SW; Playwright; prova de resolução dos subpaths e comparação da lógica movida. |
| P4 | Check, Vitest, build; todos os cenários PWA, inclusive atualização com dados persistentes; comparações de schema, rotas e formatos. |
| P5 | Build web; `cargo check --locked --manifest-path apps/desktop/src-tauri/Cargo.toml`; `cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml`; `npm run tauri:appimage`; inspeção automatizada do artefato e de suas referências. |
| P6 | `npm ci`; reconstrução isolada do checkpoint Git P1; todos os checks web/tipos/arquitetura/unitários; Chromium dev; checks nativos P5; Chromium produção/atualização após o hook Tauri; auditoria de fontes únicas e `git diff --check`. |

O gate final executa novamente os checks completos sobre a mesma revisão de código. `npm ci` não pode mudar o lockfile nem depender de arquivos locais não versionados. Não exigir reinstalação ou build nativo completo a cada ajuste pequeno das fases anteriores.

## Linter de arquitetura sem nova biblioteca

Implementar um verificador pequeno em `tooling/migration`, usando Node, TypeScript e o compilador Svelte já declarados. Ele inspeciona imports estáticos, exports, imports dinâmicos literais, scripts de componentes e metadados dos pacotes. Caminho local calculado que não possa ser resolvido deve gerar erro explicativo, não ser silenciosamente ignorado.

O verificador respeita as APIs virtuais existentes do SvelteKit. Não trata as pastas internas do pacote como domínios separados. O inventário histórico de tipos/supressões é comparado por trecho e mapa de movimentação, sem ampliar tolerâncias por contagem global.

Testes adversos obrigatórios do árbitro:

- Import de pacote para arquivo de aplicativo deve falhar.
- Caminho antigo, alias de compatibilidade ou fonte duplicada após sua fase de remoção deve falhar.
- Novo `any`, supressão, exclusão de teste ou relaxamento de configuração deve falhar.
- Teste movido que deixou de ser descoberto deve falhar mesmo se a suíte restante passar.
- Valor protegido alterado, export sem arquivo e dependência fora do manifesto devem falhar.
- Processo filho com código não zero, sinal, timeout ou relatório incompleto deve reprovar o gate.
- Contrato de uma fase posterior sem predecessor aprovado deve falhar.

As entradas inválidas vivem como dados de teste fora das fontes do produto. A suíte do árbitro deve retornar zero porque comprovou a recusa correta. Não se aceitam supressões para fazer os próprios exemplos inválidos compilarem.

## Contratos de navegador

Playwright foi autorizado pelo usuário como dependência de desenvolvimento em 19/11/2026. Fixar a versão resolvida e o navegador no lockfile/configuração da execução. Usar build de produção com servidor local, locale e fuso explícitos, fixtures locais e respostas de rede determinísticas. Bloquear acessos externos não previstos sem esconder erros do app. Fixtures usadas pelo SW devem estar acessíveis pelo servidor local; não depender exclusivamente de interceptação de requests da página para controlar tráfego do worker. Consultar as limitações na [documentação oficial de service workers do Playwright](https://playwright.dev/docs/service-workers).

| ID | Prova observável |
| --- | --- |
| WEB-01 | Abrir a SPA, navegar e recarregar rotas atuais, inclusive ID composto com dois-pontos, sem assets ausentes. |
| WEB-02 | Criar/trocar contas locais e preservar a separação de estados de leitura entre usuários. |
| WEB-03 | Importar `.notfeed.json` válido e feed de fixture, ativar fonte, ler e salvar item; verificar persistência após recarga. |
| WEB-04 | Publicar/exportar uma árvore existente no fluxo de Creator e verificar o formato por asserções, sem mudar as regras. |
| PWA-01 | Registrar o service worker real, aguardar controle, ficar offline e reabrir rota e dados já disponíveis. Não usar `serviceWorkers: block`. |
| PWA-02 | Instalar o build de referência, produzir dados, trocar para o migrado na mesma origem e conferir banco, chaves, contas e dados sem limpeza intermediária. |
| WEB-05 | Verificar estilos representativos de componentes movidos, manifest, ícones e ausência de recursos 404. |

P1 estabelece WEB-01–05 e PWA-01 na aplicação anterior à movimentação. PWA-02 usa em P1 a mesma versão para validar o procedimento e em P4 o par referência/migrada. O arquivo de referência é um artefato de teste gerado e descartável em `.artifacts`, não uma segunda fonte do aplicativo nem algo distribuído em produção.

`storageState` isoladamente não prova preservação de IndexedDB. Usar o mesmo contexto persistente/perfil de teste e a mesma origem. Não limpar caches para encobrir falha de atualização. Dados sintéticos substituem dados pessoais. Fixtures e relógio controlados devem tornar assertions reproduzíveis.

Limites: esses cenários não prometem execução contínua em background nem corrigem a ingestão XML no SW. Um cenário obrigatório que falhe no produto de referência deve ser resolvido pelo fusível antes de prosseguir, sem `.skip` ou resultado artificial.

## Limites da verificação nativa

P5 prova compilação, testes Rust disponíveis, empacotamento AppImage e integridade dos caminhos/identidade. Registra quantos testes Rust realmente existem; zero testes nativos não é apresentado como cobertura de comportamento.

Playwright no Chromium não valida automaticamente a WebView do Tauri ou notificações do sistema. Esses comportamentos não recebem selo de E2E nativo neste plano. Exigir essa cobertura adicional requer definir seu contrato e consultar o usuário sobre ferramentas não declaradas, como um driver nativo. A ausência de pré-requisito de compilação ou empacotamento, porém, bloqueia P5/P6.

## Registro de aprovação

O Auditor registra fase, revisão/hash, comandos, códigos de saída, evidências e limites. Somente então atualiza `state.md`. Alterar testes, contratos ou código depois do resultado obriga a repetir as verificações afetadas. Não aprovar por inspeção visual do log, screenshot ou relato do Builder.

A reprodução e os recibos históricos seguem a ADR 006. O AppImage é inspecionado segundo a ADR 005: código e recursos são comparados por seções, com somente o marcador Tauri previsto e RPATH de empacotamento aceitos.
