# P3 — Um pacote para o código atual

**Entrada:** P2 aprovado; o produto está em `apps/web/src/lib`.

**Contexto necessário:** C01–C04 de [contratos](../contratos.md), grafo de [invariantes](../invariantes-e-fronteiras.md), manifests, imports das fontes movidas e consumidores, entrypoint do SW e configurações de tipos/testes/CSS.

## 1. Especificação

Mover o conteúdo de `apps/web/src/lib` para `packages/notfeed/src`, preservando seus agrupamentos. Expor esse pacote privado como `@notfeed/product`, consumido pela web.

O pacote pode continuar dependendo de SvelteKit, APIs de navegador e Tauri JS já presentes. Sua extração não implica torná-lo independente do framework ou apto a todas as plataformas futuras.

## 2. Contrato/Schema

Fixar o mapa completo de imports e exports de C03: consumidores usam o nome do pacote; imports internos tornam-se relativos. Confirmar os subpaths para `.ts`, `.svelte.ts`, `.svelte` e assets existentes. A dependência da web deve resolver o workspace local.

Definir o conjunto de fontes alcançado pelo check e a correspondência das identidades de testes. Declarar os caminhos de detecção de classes do Tailwind e da configuração de componentes. Manter as APIs virtuais do framework permitidas no contrato.

```sh
npm run check:contracts -- --spec P3
```

## 3. Teste

Criar fixtures mínimas de resolução dos tipos de subpath encontrados, usando as ferramentas já presentes. Verificar resolução e compilação com TypeScript/Svelte, Vitest e build do SW. Testar tanto resolução válida como export sem destino e import proibido do pacote para a web.

Preparar as provas de abrangência: um teste omitido reprova a descoberta, arquivo não importado continua sujeito ao check e classes representativas de componentes movidos mantêm estilo no navegador.

Definir a comparação de fontes normalizando somente os imports/caminhos previstos; uma mudança em expressão de negócio deve ser detectada. Validar as fixtures antes da movimentação real.

## 4. Implementação mínima

- Mover a árvore inteira para o pacote e remover sua origem na web na mesma alteração.
- Declarar manifest/exports e distribuir as dependências existentes entre consumidores, sem duplicar instâncias de Svelte ou atualizar versões.
- Reescrever os imports externos e internos conforme o mapa; não recriar `$lib` como alias para o novo pacote.
- Atualizar o import direto do PostManager no SW. Não usar o barrel geral de componentes/stores nesse entrypoint.
- Incluir o pacote completo nos checks, na descoberta de testes e nas fontes CSS. Ajustar a configuração de componentes para os caminhos novos.

Uma necessidade de outra estrutura de exports ou nova ferramenta aciona o fusível. Não acumular fallback, wrapper de compatibilidade ou abstrações de domínio para contornar a resolução.

## 5. Quality Gate

```sh
npm run gate:migration -- P3
```

**Aceite:** saída zero em contratos, arquitetura, testes do árbitro, check de todas as fontes, Vitest, build web/SW e Playwright. Exports resolvem nas ferramentas consumidoras, estilos dos componentes estão presentes e a web usa o pacote local.

As identidades dos testes existentes estão preservadas; alterações de fonte são explicadas pelo mapa de imports/caminhos. Não existem fontes em `apps/web/src/lib`, imports do alias antigo, arestas reversas ou alterações de dados protegidos.

**Auditoria:** verificar escapes por caminhos relativos, aliases de configuração e imports dinâmicos; o nome do pacote não basta para provar uma fronteira. Conferir que check/testes não passaram por terem deixado de ler fontes movidas.

**Handoff:** registrar mapa e checkpoint em `state.md`. A organização interna continua sendo a anterior; não registrar novos módulos de negócio como resultado desta fase.
