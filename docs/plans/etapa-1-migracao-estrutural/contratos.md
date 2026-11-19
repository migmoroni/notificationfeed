# Contratos técnicos da etapa 1

Os contratos tratam da movimentação e da validação. Não criam schemas de negócio. O [manifesto](contracts/etapa-1.json) é a referência legível por máquina; divergências entre ele, este documento e o código acionam o fusível.

## C01 Mapa de localização

| Origem atual | Após P2 | Após P3 |
| --- | --- | --- |
| `src/routes`, `src/app.*`, `src/service-worker.ts` | `apps/web/src/` | Mesmo destino |
| `src/lib/` | `apps/web/src/lib/` | `packages/notfeed/src/` |
| `static/` | `apps/web/static/` | Mesmo destino |
| `svelte.config.js`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `components.json` | `apps/web/` | Ajustados para incluir o pacote |
| `scripts/generate-icons.mjs` | `apps/web/scripts/generate-icons.mjs` | Mesmo destino |
| `src-tauri/` | `apps/desktop/src-tauri/` | Mesmo destino |
| `docs/`, licenças | Raiz existente | Mesmo destino |

Cada arquivo movido tem uma única origem e um único destino. P0 inventaria o código e P2/P3 registram o mapa efetivo, incluindo arquivos não listados individualmente nesta tabela. Hashes e comparação de conteúdo normalizando apenas imports e caminhos declarados detectam perda, duplicação e mudanças de lógica não previstas.

## C02 Workspace e dependências

Manter npm, um lockfile na raiz e workspaces privados. O pacote de produto terá versão local `0.0.1`; a web declara `@notfeed/product` com essa versão, resolvida como workspace local. O gate verifica a resolução local efetiva. Não usar `workspace:*`, trocar o gerenciador ou publicar o pacote. A resolução local segue o mecanismo de links de [npm workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces/).

Distribuir as dependências já existentes conforme seus consumidores. Svelte e SvelteKit podem ser dependências de par do pacote quando necessário para evitar instâncias duplicadas; devem ser resolvidas pelas mesmas versões do lockfile. Não adicionar `@sveltejs/package`: o pacote é privado e suas fontes são compiladas pelo Vite/Svelte existentes.

Registrar versões resolvidas na referência e comparar após a reorganização. Alterações do lockfile devem corresponder à localização dos workspaces e ao Playwright autorizado, incluindo suas transitivas. Atualização incidental de versões de produto reprova o gate.

## C03 Imports e exports

Após P3, consumidores externos usam `@notfeed/product` ou seus subpaths. Imports internos preservam a estrutura atual por caminhos relativos. Remover os imports `$lib` antigos; não remapear `$lib` para o pacote como ponte de compatibilidade.

Exports privados de fonte propostos:

```json
{
  ".": "./src/index.ts",
  "./*.js": "./src/*.ts",
  "./*.svelte": "./src/*.svelte",
  "./*.svg": "./src/*.svg"
}
```

O mapeamento `.js` também cobre arquivos `.svelte.js` para `.svelte.ts`. JSONs existentes continuam acessados por imports relativos internos. A API por subpaths preserva a organização atual, sem criar fachadas de negócio. P3 deve provar a resolução em Svelte, TypeScript, Vitest e no build do SW antes de aprovar esse contrato em execução. Se uma ferramenta exigir uma solução estrutural diferente, parar e decidir, sem acumular aliases ou fallback.

O import relativo do PostManager em `src/service-worker.ts` passa a apontar diretamente ao subpath correspondente. Não importar o barrel do produto no SW, pois ele também exporta componentes e stores de interface.

## C04 Compilação e descoberta de arquivos

A verificação Svelte/TypeScript deve incluir o código da web e todo o pacote, inclusive arquivos que não são alcançados pela rota inicial. Manter `strict: true` e `checkJs: true`. A descoberta Vitest deve incluir os testes movidos; comparar a lista de identidades dos testes, não apenas a contagem.

O Tailwind deve detectar classes dos componentes no pacote. Ajustar caminhos de fontes no CSS e a configuração de componentes existente, sem instalar outro gerador. O gate de navegador verifica estilos representativos além da presença de HTML.

O gerador de ícones continua operando sobre `apps/web/static/icons`; a movimentação não deve alterar as imagens. Configurações e comandos usam caminhos relativos ao projeto, sem caminhos pessoais absolutos.

## C05 Artefatos e desktop

Web: `apps/web/build`, fallback `index.html`, manifest e service worker existentes. Preservar URLs públicas, escopo de registro do SW, nomes de caches e origem de implantação.

Desktop: manter crate, lockfile, features, permissões, ícones e identificador. Partindo de `apps/desktop/src-tauri`, `frontendDist` aponta para `../../web/build`. O pacote desktop executa a CLI no seu diretório; os hooks chamam o workspace web, evitando recursão por scripts que também construam o desktop. Preservar `devUrl` atual.

Não criar Cargo workspace ou CMake apenas para uso futuro. A compilação Rust continua usando o manifesto existente em sua nova localização.

## C06 Dados e contratos públicos do produto

Preservar `PERSISTENCE`, `STORE_SPECS`, índices e formatos de chaves. Comparar esses valores com a referência por teste. O formato `.notfeed.json`, as rotas e as chaves de localStorage também devem ser inventariados e conservados.

A prova de atualização usa o mesmo origin de teste e o mesmo perfil/contexto de navegador: criar dados no build de referência, servir o build migrado e verificar sua permanência. Limpar IndexedDB, mudar de porta/origem ou reimportar os dados depois da atualização invalida essa prova.

## C07 Comandos e evidências

Os scripts de gate ainda não existem. P0 os cria e testa antes de mover código. Na raiz ficam `check`, `test:run`, `build`, `lint:architecture`, `test:gate`, `test:e2e`, `check:contracts` e `gate:migration`, além dos comandos existentes de desenvolvimento e Tauri que continuarem aplicáveis. Após a movimentação, a raiz delega aos workspaces corretos; não simula a árvore antiga.

O árbitro `tooling/migration/gate.mjs` recebe o ID da fase, verifica seu predecessor e executa uma lista fixa de comandos. Não aceita flags para ignorar verificações. Usa processos filhos e propaga qualquer saída não zero, sinal ou timeout.

Cada execução produz evidência em `.artifacts/migration/<fase>/<execucao>/`: comandos, versões de ferramentas, horários, duração, saída, código de retorno, hashes/identificador do código auditado e resultado. Artefatos de teste são ignorados pelo Git; decisões e resumos ficam versionados em `state.md` e ADRs. Uma alteração posterior no código invalida a evidência dos checks afetados.

A aprovação do predecessor refere-se ao checkpoint histórico daquela fase. A movimentação prevista na fase seguinte não apaga essa aprovação histórica, mas exige seu próprio gate. Nenhum resultado anterior pode ser reutilizado como se tivesse verificado fontes modificadas. Os hashes de entrada excluem logs/artefatos gerados e a anotação do resultado em `state.md`, evitando que a gravação da evidência invalide a própria execução.

## C08 Referência e limitações conhecidas

A avaliação anterior encontrou 24 arquivos de teste, 201 testes passando e seis falhas em datas; a configuração usa `jsdom` e o idioma padrão é `en-US`. Esses números são observações anteriores, não um gate aprovado. P0 executa novamente e corrige a configuração determinística dos testes sem mudar o idioma padrão do produto.

O parsing XML de RSS/Atom usa `DOMParser`, ausente no service worker. A persistência também possui upgrade destrutivo ao mudar a versão. Esses pontos não serão tratados como funcionalidades corrigidas pela migração. Os gates de PWA cobrem shell, assets, dados locais e atualização; não prometem ingestão XML em background. Qualquer falha desses contratos efetivamente cobertos exige correção delimitada ou Stop & Ask, nunca um teste marcado como falha esperada.
