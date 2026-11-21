# ADR 007 — Atualizações de UI e assets

**Data:** 20/11/2026. **Estado:** UI/CSS aprovada; PWA/assets aprovada em gate completo.

Preservar os componentes, estilos e interações atuais. Atualizar os grupos registrados em updates.json separadamente, sem redesenho ou reorganização do produto. O contrato existente do navegador verifica CSS computado do botão Create e os fluxos de diálogo/publicação/exportação; os 207 testes e os tipos estritos continuam obrigatórios.

O grupo UI/CSS mantém Tailwind 4 e Bits UI 2. As mudanças transitivas são a cadeia do compilador CSS e seus binários opcionais, Floating UI, datas, foco e composição de classes, conforme ui-css-delta.json. Os peers oficiais aceitam o runtime/framework já adotados. Não foi necessário alterar fontes do produto.

O pnpm acrescentou automaticamente tailwind-merge@3.7.1 à preferência não estrita de maturidade. O alvo exato já estava selecionado em 2.1; o registry oficial informa publicação em 19/11/2026 e a integridade corresponde ao metadado preservado. Não há script de instalação nesse pacote. Registrar somente essa versão em manager.json, como as seleções exatas anteriores. O guard inicialmente recusou a mudança não revisada e continua exigindo correspondência exata, sem exceções por nome/glob nem relaxamento de integridade, peers, scripts ou auditoria.

Depois da alteração automática de configuração, o pnpm exigiu materialização do ambiente. pnpm install --frozen-lockfile passou e os tipos retornaram zero erros/avisos. Auditoria não encontrou combinações de advisory/versão sem classificação; caminhos atuais foram revisados. Esses resultados não substituem o gate completo.

Fontes: [Tailwind](https://tailwindcss.com/docs/upgrade-guide), [Bits UI](https://www.bits-ui.com/docs/getting-started), [registry oficial](https://registry.npmjs.org/tailwind-merge/3.7.1). Metadados e grafo de entrada em .artifacts/maintenance/2.4/ui-css/input.

PWA/assets: Workbox 7.4.1 e Sharp 0.35.5 adotados isoladamente. Sharp removeu o script de instalação, exige Node >=20.9 e remove APIs obsoletas não usadas pelo gerador atual. Removida a permissão sharp@0.34.5 sem substituição; instalação congelada passou. Prova executa a fonte real do gerador em árvore sintética e verifica quatro PNGs, dimensões e fundo maskable, antes/depois da atualização. Assets versionados e código de SW permanecem intactos. Novos metadados opcionais de plataformas na distribuição Sharp não habilitam alvo, integração WASM ou toolchain. Deltas em pwa-assets-delta.json; fontes oficiais de compatibilidade e metadados constam em updates.json.

A primeira instalação limpa PWA/assets falhou no node-datachannel 0.29.0 inalterado: timeout upstream acionou fallback de compilação quebrado, antes dos consumidores. Estender o provisionamento verificado já usado na referência para o cache novo do candidato atual, sem reutilizar caches anteriores. Contrato ativo em tooling/checks/contracts/prebuild.json exige o mesmo pacote/versão/host/URL/SHA256; o grafo atual deve corresponder. Compartilhar o downloader verificado entre os dois consumidores. Provas devem rejeitar digest, status HTTP, versão e host incompatíveis antes de instalar. Manter scripts, lock congelado e repetição offline; o recibo registra o download. Isso estabiliza a obtenção do artefato, sem dispensar testes ou modificar o produto.
