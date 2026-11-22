# ADR 001 Escopo estrutural e topologia

**Data:** 19 de novembro de 2026

**Status:** Diretriz do plano baseada no escopo acordado; implementação não iniciada.

## Contexto

O usuário quer resolver a organização atual antes de definir os módulos que acompanharão a evolução do produto. Extrair domínios ou tornar todo o código independente de Svelte agora prolongaria a migração.

## Decisão

Usar npm workspaces, mantendo o gerenciador existente. Separar os aplicativos web e desktop e reunir o conteúdo atual de `src/lib` em um único pacote privado `@notfeed/product`, conservando suas pastas e dependências de framework. Na fase intermediária P2, esse conteúdo permanece dentro da web; P3 o move sem duplicação.

O Tauri usa o artefato web e mantém seu Rust atual. Não criar módulos de negócio, pacote de domínio puro, aliases da árvore antiga ou infraestrutura para linguagens futuras. As APIs virtuais SvelteKit existentes são dependências de framework permitidas.

## Consequência

A etapa 1 prova instalação, compilação, execução web/PWA e empacotamento desktop na nova estrutura. A distribuição das responsabilidades internas é definida na etapa 2 com o usuário. Impedimento técnico que force outro desenho aciona o fusível antes de alterar esta decisão.

