# Invariantes e fronteiras da etapa 1

## Leis invioláveis

| ID | Regra |
| --- | --- |
| INV-01 | Migrar a estrutura mantendo os agrupamentos atuais. Não criar módulos de negócio, novas funcionalidades ou novas plataformas. |
| INV-02 | Manter uma única implementação ativa. Não criar `legacy`, cópias do aplicativo, aliases ou wrappers para sustentar a árvore antiga. |
| INV-03 | Preservar dados locais, nome e versão do banco, stores, índices, chaves, identidade Tauri e formato `.notfeed.json`. A migração não pode apagar ou converter dados. |
| INV-04 | Respeitar o grafo entre aplicativos e pacote. Pacotes não importam arquivos dos aplicativos. |
| INV-05 | Manter tecnologias e dependências de produto. A única nova biblioteca autorizada para planejamento é `@playwright/test`, exclusivamente de desenvolvimento. Outra biblioteca aciona o fusível. |
| INV-06 | Manter TypeScript estrito e a cobertura existente de arquivos e testes. Não enfraquecer verificações para conseguir compilar. |
| INV-07 | Contrato e testes vêm antes da implementação da fase. Não antecipar trabalho de uma fase dependente. |
| INV-08 | Gate só passa com execução efetiva e código zero. Falha, ferramenta ausente, timeout ou teste ignorado não são aprovação. |
| INV-09 | Alterar apenas o recorte da fase. Problema estrutural ou mudança de comportamento não prevista exige Stop & Ask. |
| INV-10 | Registrar evidências, decisões e handoff. Recuperação usa checkpoints no Git, preservando alterações do usuário. |

## Topologia final

```text
notfeed-app/
├── package.json                    # Orquestração e npm workspaces
├── package-lock.json               # Único lockfile npm
├── apps/
│   ├── web/                        # @notfeed/web
│   │   ├── package.json
│   │   ├── src/                    # Rotas, layout, app.css, app.html e SW
│   │   ├── static/
│   │   └── scripts/generate-icons.mjs
│   └── desktop/                    # @notfeed/desktop, wrapper de execução
│       ├── package.json
│       └── src-tauri/               # Rust, Cargo.lock, configuração e ícones atuais
├── packages/
│   └── notfeed/                    # @notfeed/product, privado e único
│       ├── package.json
│       └── src/                    # Conteúdo atual de src/lib, incluindo testes
├── tooling/
│   ├── migration/                  # Árbitro e verificações sem lógica de produto
│   └── e2e/                        # Testes, fixtures e configuração Playwright
└── docs/
```

Os nomes de pacotes são identificadores técnicos; não representam novos domínios. `packages/notfeed/src` conserva `domain`, `stores`, `services`, `ingestion`, `normalization`, `persistence`, `platform`, `components` e demais agrupamentos existentes. Não haverá pacote `core` puro nem pacotes separados de adaptadores nesta etapa.

P2 estabelece os aplicativos com `src/lib` ainda dentro da web. P3 move esse conteúdo para o pacote em uma única mudança de localização, sem manter as duas árvores. Nenhum diretório vazio é criado para funcionalidades futuras.

## Grafo unidirecional

```text
orquestração da raiz ──executa──> web / desktop / verificações
apps/web ──importa──> @notfeed/product ──importa──> dependências declaradas
apps/desktop ──empacota──> artefato de apps/web
apps/desktop/src-tauri ──usa──> crates já declaradas
tooling ──inspeciona/testa──> contratos, aplicativos e pacote
```

O vínculo desktop → web é de execução e artefato, não de importação de código-fonte. Web e pacote não importam arquivos de `apps/desktop`. O pacote não importa rotas ou arquivos de `apps/web`. Código de produto não importa `tooling` ou `docs`.

As dependências Svelte, SvelteKit, Tauri JS e APIs de navegador já presentes no pacote são permitidas. `$app/navigation` e `$app/environment` são módulos virtuais do framework, não imports de arquivos de `apps/web`. Não haverá exigência de executar todo o pacote fora de SvelteKit nesta etapa. `$service-worker` permanece no entrypoint do SW dentro da web.

O grafo aplica-se aos pacotes, não impõe uma reorganização dos imports internos entre as pastas atuais do produto.

## Restrições negativas

- Não introduzir `any`, casts em cadeia para escapar da tipagem, `@ts-ignore`, `@ts-nocheck`, supressões de linter ou novas supressões Svelte.
- Não mudar `strict` para `false`, ampliar exclusões, retirar arquivos de verificação ou aumentar tolerâncias para ocultar problemas. Opções atuais como `skipLibCheck` devem ser inventariadas e não ampliadas.
- Não usar `.skip`, `.todo`, `.only`, `test.fail`, snapshots regravados sem revisão, `--passWithNoTests`, `--if-present`, `|| true` ou sucesso artificial nos gates.
- Não excluir testes ou reduzir suas asserções para transformar uma regressão em sucesso.
- Não adicionar dependências de produto, trocar npm por outro gerenciador, instalar Nx/Turbo ou criar toolchains futuras sem decisão explícita.
- Não publicar pacotes, mudar a origem de implantação, ativar SQLite, alterar o identificador Tauri ou atualizar versões de bibliotecas incidentalmente.
- Não introduzir comunicação HTTP entre módulos, extração de serviços, novas interfaces por domínio ou reescrita do PostManager.

O código atual contém tipagens e supressões históricas. Para evitar uma limpeza geral nesta etapa, P0 registra suas ocorrências exatas e os hashes dos trechos. Uma movimentação pode preservá-las; novas ocorrências, modificações ou ampliações falham no gate. Esse inventário não desliga regras, não autoriza novas exceções e não permite tratar testes falhos como aprovados. Trechos novos ou reescritos obedecem integralmente às restrições.

## Mudança de fronteira

Se a implementação exigir quebrar uma regra, parar o recorte afetado, citar o ID, explicar a evidência e apresentar uma alternativa compatível. Uma revisão de requisito exige decisão do usuário, atualização do contrato e ADR antes da implementação. O executor não altera o árbitro para justificar o próprio código.

