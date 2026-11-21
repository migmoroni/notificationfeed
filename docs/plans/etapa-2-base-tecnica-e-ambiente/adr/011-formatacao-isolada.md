# ADR 011 — Formatação isolada

**Data:** 20/11/2026. **Estado:** contrato/provas aprovados; aprovada.

Adotar Prettier 3.10.1/plugin Svelte 4.2.0 autorizados e rustfmt do toolchain fixado. Configuração permanente em tooling/checks/contracts/format.json: tabs, aspas simples, sem trailing commas, semicolons, largura 100 e prosa preservada. O estilo acompanha o predominante nas fontes Svelte/TS e reduz mudanças desnecessárias. Não aplicar regra opcional de ordenação de classes/imports.

Excluir somente gerados/locks e os registros históricos identificados: plano/provas da etapa 1, receita de entrada, baseline da captura, grafo antes do pnpm e deltas/adoção já aprovados. Não excluir fontes ativas, tooling em execução, configurações, documentação da etapa 2 ou futura. A captura histórica permanece intacta, sem reescrever hashes para aceitar a formatação.

Provas antes da aplicação: JS/TS/Svelte formatam e permanecem válidos, formatter check recusa arquivo fora do padrão sem escrevê-lo, fontes ativas são descobertas, exclusões históricas são respeitadas. Fazer dry-run dos arquivos protegidos e exigir seus valores/tokens existentes. Guardar fontes/manifest de entrada para revisar a diferença de formatação separadamente das mudanças funcionais anteriores.

A aplicação usa somente Prettier e cargo fmt. Não corrigir lógica nem atualizar dependências de produto nesta unidade. Após aplicar, executar format check novamente sem diff, lint, Clippy, tipos, as mesmas identidades unitárias e gate completo com consumidores reais.

Fontes: [opções Prettier](https://prettier.io/docs/options), [plugin Svelte 4](https://github.com/sveltejs/prettier-plugin-svelte). Alvos e peers já verificados, preservados na entrada da unidade.

As três provas do formatter passaram, incluindo recusa sem escrita e descoberta completa. Dry-run preservou exatamente todos os hashes semânticos/valores dos arquivos protegidos, incluindo banco/schema/exportação/permissões; não foi necessário substituir ou enfraquecer o guard. Simulação de 399 arquivos JS/TS/Svelte manteve as 29 ocorrências sintáticas restantes. O delta contém só Prettier/plugin e quatro arestas de raiz/peers, sem mudança de dependência de produto; auditoria sem nova combinação de advisory/versão.

Aplicação registrada em formatting-result.json: nenhum arquivo de fonte acrescentado/removido e locks preservados byte a byte. support.ts apresentou reorganização adicional de uma cadeia pelo formatter; duas saídas subsequentes convergiram e o hash de tokens semânticos permaneceu igual. Check repetido é somente leitura e não modifica o snapshot. Contratos, restrições, lint, tipos e rustfmt passaram após a aplicação; o gate completo também passou, incluindo 207 unitários, AppImage e Chromium 1/3/3.
