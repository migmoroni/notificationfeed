# ADR 006 — Checkpoint P1 em Git bundle e aprovações históricas

**Data:** 19/11/2026. **Estado:** aceita; concretiza a reprodução e o handoff de P6.

Logs e builds em `.artifacts` são descartáveis. A prova final não pode depender deles para recuperar a referência anterior à movimentação.

Registrar o estado exato P1 em `tooling/migration/reference/pwa-reference.bundle` e sua receita JSON. O checkpoint inclui os arquivos que ainda não estavam rastreados naquela fase. Seu hash de todos os arquivos auditados coincide com a evidência P1 (`b9d5a9f2b5620c5fb81a68caeaa0ac93f5debf23f771d0c0d3e6ed0e2178056f`). O bundle incremental usa a revisão base já presente no histórico do projeto.

A reconstrução cria um repositório Git isolado, importa somente a base e o bundle versionado, extrai o checkpoint, confere os hashes, executa `npm ci` e build. O teste usa esse novo artefato e remove a cópia temporária das fontes. Nenhuma fonte anterior integra a aplicação ativa.

HEAD, índice e branch atuais foram preservados. Uma tentativa de movê-los foi rejeitada pela revisão automática e não foi executada; a alternativa usa apenas índice temporário e um novo ref dedicado, exportado no bundle. A reprodução também verifica que HEAD/índice atuais não mudaram.

`reference/approvals.json` preserva os recibos reais P0–P5 para o predecessor histórico em clones novos. Esses recibos não validam código modificado: P6 executa todos os seus checks novamente. A sequência final empacota antes dos testes de navegador para que eles cubram o build emitido pelo hook Tauri.

O editor precisa descobrir a configuração ao abrir arquivos em `packages/notfeed`. Um `tsconfig.json` na raiz estende a configuração web, já responsável pela verificação integral desse pacote. Isso mantém uma única definição de tipos e não remapeia imports ou sustenta fontes antigas.
