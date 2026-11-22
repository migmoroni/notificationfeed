# P2 — Workspace e localização dos aplicativos

**Entrada:** P1 aprovado e referência web/PWA disponível.

**Contexto necessário:** mapa C01, workspace C02 e artefatos C05 de [contratos](../contratos.md); manifests, configurações, scripts, `.gitignore`, arquivos de entrada e configuração Tauri. O conteúdo de `src/lib` permanece junto, sem revisão interna.

## 1. Especificação

Estabelecer npm workspaces e localizar a web em `apps/web` e o desktop em `apps/desktop`. Nesta fase, `src/lib` permanece dentro da web. O pacote de produto só passa a existir em P3.

Não separar módulos, reorganizar agrupamentos internos ou mudar versões das bibliotecas existentes.

## 2. Contrato/Schema

Completar o mapa de movimentação com todos os arquivos de entrada/configuração encontrados em P0. Definir manifests privados, comandos da raiz e dos aplicativos, resolução das dependências e destino dos arquivos gerados. P2 declara somente workspaces que existem nesta fase.

Preservar os comandos de desenvolvimento, build, check, testes e Tauri. A raiz passa a orquestrar os workspaces; ela não oferece aliases de imports ou diretórios antigos.

Definir os hooks Tauri com diretório de trabalho explícito ou resolução testada, `frontendDist: ../../web/build` a partir de `apps/desktop/src-tauri` e a mesma `devUrl`. `prepare` deve sincronizar a web e propagar falhas, sem duplicar hooks que provoquem recursão.

```sh
npm run check:contracts -- --spec P2
```

## 3. Teste

Antes da movimentação, acrescentar fixtures dos caminhos finais ao validador e provas de que uma origem antiga remanescente, hook recursivo ou dependência resolvida fora do workspace reprova o contrato.

Adaptar a seleção de diretório dos testes existentes sem alterar suas asserções. Registrar a correspondência de identidades antes/depois. Preparar o smoke de P1 para consumir o build do workspace.

## 4. Implementação mínima

- Mover fontes web, assets, configurações e gerador de ícones conforme C01. Mover `src-tauri` integralmente, incluindo lockfile, ícones e capacidades.
- Criar os dois manifests privados; distribuir dependências existentes por uso. Manter um único `package-lock.json` npm na raiz.
- Ajustar scripts, hooks, caminhos relativos, descoberta de testes e arquivos ignorados. Build, `.svelte-kit` e `target` devem ficar nos locais apropriados, sem entrar no controle de versão.
- Atualizar apenas as instruções de desenvolvimento afetadas pela mudança de caminho.

Não criar `packages/notfeed` vazio, pontes para a raiz antiga ou cópias de fontes. As mudanças em arquivos movidos se limitam aos caminhos declarados no contrato.

## 5. Quality Gate

```sh
npm run gate:migration -- P2
```

**Aceite:** saída zero em contratos, arquitetura, testes do árbitro, check, Vitest, build, smoke web/PWA e `cargo metadata --locked --no-deps --format-version 1 --manifest-path apps/desktop/src-tauri/Cargo.toml`. Cada fonte possui um único destino; não há `src`, `static` ou `src-tauri` ativos na raiz antiga.

O gate comprova o diretório dos comandos, paths do Tauri, descoberta integral dos testes e preservação das versões resolvidas. Validar scripts de desenvolvimento por inicialização e resposta HTTP; encerrar o processo de servidor de forma controlada após a prova, sem tratar sua terminação esperada como um gate falho.

**Auditoria:** procurar caminhos absolutos pessoais, imports quebrados, scripts da raiz que ainda dependam da estrutura anterior e arquivos esquecidos no mapa. O empacotamento nativo completo permanece obrigatório em P5.

**Handoff:** registrar mapa efetivo, evidência e checkpoint. A única árvore de produto nesta saída é `apps/web/src/lib`; P3 recebe esse estado.
