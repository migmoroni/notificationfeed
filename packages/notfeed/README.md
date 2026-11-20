# @notfeed/product

Pacote privado de fontes do produto atual. Conserva componentes, stores, domínio, ingestão, normalização, persistência e plataforma nos agrupamentos existentes. A organização dos módulos de negócio pertence à etapa 2.

A web consome subpaths como `@notfeed/product/stores/feed.svelte.js` e `@notfeed/product/components/ui/button/index.js`. Imports internos são relativos. Svelte e SvelteKit são dependências de par; módulos virtuais já usados (`$app/navigation`, `$app/environment`) continuam permitidos.

Execute check, testes e build pelos comandos da raiz. O check inclui toda esta árvore, inclusive arquivos não alcançados pelas rotas; os testes permanecem junto às fontes. O service worker importa o PostManager diretamente, sem o barrel de interface.
