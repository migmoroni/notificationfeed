# ADR 005 — pnpm e comparação dos grafos

**Data:** 20/11/2026. **Estado:** aceita; gate completo 2.3 aprovado, conforme state.md.

Após a saída 2.2 aprovada, importar o lock para pnpm 11.28.12. Fixar as dependências diretas nas versões já resolvidas e usar workspace:* para o produto local. Não alterar Cargo.lock ou atualizar deliberadamente bibliotecas. Node 22.21.1 permanece até o grupo de runtime da 2.4. O pnpm foi provisionado em .artifacts/toolchains, sem substituir ferramentas globais.

A comparação usa o JSON público de `pnpm list --recursive --lockfile-only --depth Infinity --json`, sem adicionar parser YAML. Canonizar identidades por pacote/versão e consumidor, preservando o grafo bruto e todos os caminhos de auditoria. A listagem pode indicar o mesmo path para versões distintas antes da instalação; os testes impedem que isso descarte um nó.

O delta não introduz versões. Os quatro nós e treze arestas WASI representados separadamente pelo npm continuam em bundledDependencies do oxide-wasm32-wasi com a mesma versão/integridade. Quatro arestas são peers opcionais de debug/follow-redirects ligados a versões já presentes. Todas as diferenças estão em manager-delta.json; alteração posterior exige nova revisão. A instalação limpa, os consumidores Linux e os testes completos continuam obrigatórios.

A auditoria pnpm forneceu 155 combinações advisory/versão, todas presentes na classificação anterior. pnpm-security.json vincula cada uma às chaves npm originais e aos caminhos completos. A coleta atual deve conferir versão, classificação equivalente, caminhos e condições de exposição; advisory/caminho novo ou classificação ambígua reprova. Contagens de formatos diferentes não representam queda/aumento de vulnerabilidades.

Exigir engines/peers, gerenciador exato e scripts explicitamente revisados. Somente esbuild 0.27.3, sharp 0.34.5, node-datachannel 0.29.0 e o fsevents opcional 2.3.3 têm scripts de instalação permitidos nesta unidade. Nenhuma permissão global, hoisting para esconder imports ou waiver de peer foi introduzido. O candidato usa store, cache de metadata e cache de lifecycle novos; a repetição offline também precisa preservar os locks.

Comandos delegam por consumidor; hooks Tauri chamam diretamente o app web. Remover os aliases de aprovação históricos da raiz, preservando seus arquivos/recibos. A extração completa dos checks cotidianos continua em 2.5. Receitas npm históricas permanecem somente na reprodução isolada de referências.

Fontes primárias: [listagem pnpm 11](https://github.com/pnpm/pnpm/blob/main/pnpm11/docs/cli/list.md), [scripts de instalação](https://github.com/pnpm/pnpm/blob/main/pnpm11/docs/settings/build.md), [configuração e versão do gerenciador](https://github.com/pnpm/pnpm/blob/main/pnpm11/docs/settings/cli.md), [auditoria pnpm](https://github.com/pnpm/pnpm/blob/main/pnpm11/deps/compliance/audit/src/index.ts).
