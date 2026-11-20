# Invariantes e fronteiras da etapa 2

## Leis invioláveis

| ID | Regra |
| --- | --- |
| E2-INV-01 | Manter os três workspaces atuais e os agrupamentos do pacote único. Organização de negócio pertence à etapa 3. |
| E2-INV-02 | Uma implementação ativa por responsabilidade. Sem `legacy`, cópia de produto, alias antigo, reexport ou wrapper destinado a sustentar estrutura substituída. |
| E2-INV-03 | Preservar banco `notfeed-v2` v18, stores, índices, chaves, formatos de importação/exportação, contas, URLs públicas e identidade `app.notfeed.desktop`. Não apagar, converter ou reimportar dados para fazer um gate passar. |
| E2-INV-04 | Obedecer ao grafo abaixo; nenhuma dependência pacote → aplicativo, produto → tooling ou import de fontes entre aplicativos. |
| E2-INV-05 | Separar migração do gerenciador de atualizações deliberadas. Um grupo de compatibilidade por vez, com versões e diferença de lockfile explicadas. |
| E2-INV-06 | Dependências diretas devem ser declaradas por seus consumidores. Ferramentas adicionais somente dentro da autorização registrada; nova biblioteca direta não prevista exige consulta. |
| E2-INV-07 | Preservar `strict: true`, `checkJs: true`, descoberta integral de fontes e identidade/cobertura dos testes. Não relaxar tipos, lint, assertions ou critérios de segurança para obter zero. |
| E2-INV-08 | Validar contrato e prova antes da implementação. Aprovação depende de comandos executados, saída zero e evidência vinculada às fontes e contratos atuais. |
| E2-INV-09 | Não presumir sucesso diante de erro, timeout, sinal, ferramenta ausente, teste ignorado, relatório inválido ou job obrigatório omitido. |
| E2-INV-10 | Checks permanentes não exigem aprovação P0–P6 nem hashes imutáveis do produto. Preservar os comprovantes históricos; não reescrevê-los como provas das versões novas. |
| E2-INV-11 | Mudanças no produto limitam-se às correções e adaptações técnicas necessárias e testadas. Mudança de regra, schema, plataforma ou redesenho amplo exige Stop & Ask. |
| E2-INV-12 | Registrar estado, decisões e recuperação reproduzível; preservar trabalho do usuário e dados pessoais. Artefatos de teste usam dados sintéticos. |

## Topologia preservada e acréscimos técnicos

```text
notfeed-app/
├── package.json                  # comandos e packageManager exato
├── pnpm-workspace.yaml           # três workspaces atuais
├── pnpm-lock.yaml                # substitui package-lock.json em 2.3
├── .nvmrc                       # versão de referência Node
├── rust-toolchain.toml           # versão exata e componentes Rust
├── eslint.config.js              # configuração acordada em 2.1
├── .prettierrc.json
├── .prettierignore               # somente gerados, binários e histórico identificado
├── apps/web/                    # SvelteKit, rotas, assets e SW
├── apps/desktop/src-tauri/       # crate e Cargo.lock existentes
├── packages/notfeed/             # pacote privado único, ainda ligado a SvelteKit
├── tooling/
│   ├── migration/               # provas históricas da etapa 1
│   ├── maintenance/             # árbitro, contratos realizados e evidências da etapa 2
│   ├── checks/                  # verificações permanentes e execução de comandos
│   └── e2e/                     # cenários atuais, adaptados sem perder assertions
├── .github/workflows/            # CI prevista para o remoto GitHub existente
└── docs/plans/etapa-2-base-tecnica-e-ambiente/
```

Não criar pacotes de configuração vazios, workspace Cargo sem segundo crate, Nx, Turbo, Docker, devcontainer, backend, bindings, WebAssembly ou toolchain C++. A ferramenta de cada ecossistema continua responsável por suas dependências: pnpm para JS/TS; Cargo para Rust.

## Grafo permitido

```text
raiz e CI ──executam──> aplicativos, Cargo e tooling
apps/web ──importa──> @notfeed/product ──importa──> dependências declaradas
apps/desktop ──empacota──> apps/web/build
apps/desktop/src-tauri ──usa──> crates declaradas
tooling/maintenance ──executa──> tooling/checks e tooling/e2e
tooling/e2e ──usa──> utilidades de tooling/checks
tooling/checks ──inspeciona/testa──> fontes, manifests e contratos permanentes
```

`tooling/checks` não importa `tooling/maintenance`, `tooling/migration` ou os recibos das fases. O estado realizado necessário aos checks cotidianos fica em `tooling/checks/contracts/`; o histórico fica em `tooling/maintenance/` ou nos documentos. O produto não importa nenhuma dessas pastas.

O pacote conserva as dependências Svelte/SvelteKit/Tauri JS e APIs de navegador existentes. `$app/navigation` e `$app/environment` continuam permitidos como módulos virtuais do framework; `$service-worker` fica no entrypoint web. Não impor novas fronteiras entre `stores`, `services`, `persistence` e demais pastas internas.

## Restrições negativas

- Não introduzir `any`, casts encadeados para escapar dos tipos, `@ts-ignore`, `@ts-nocheck`, supressões ESLint/Svelte/Rust ou permissões globais para contornar diagnósticos.
- Não ampliar `skipLibCheck`, excluir fontes/testes ativos, desligar regras após uma falha, criar baseline de erros ESLint aceitos ou usar `--quiet` para ocultar avisos.
- Não usar `.skip`, `.todo`, `.only`, falhas esperadas no gate final, `--passWithNoTests`, `--if-present`, `continue-on-error`, `|| true` ou retries que aprovem um teste instável.
- Não usar `audit fix --force`, atualizar tudo em lote, ignorar advisories genericamente, permitir qualquer peer ou hoisting global para esconder dependências ausentes.
- Não desativar integridade/TLS, permitir scripts de instalação de todos os pacotes ou usar versão flutuante de runtime, gerenciador, auditor ou actions na CI final.
- Não mudar banco, storage backend, origem de implantação, permissões Tauri ou regras do produto como efeito colateral de manutenção.
- Não publicar pacotes, distribuir AppImage, acessar dados pessoais ou modificar proteção de branch como parte implícita deste plano.

## Dívida histórica sem novas exceções

Há tipos `any` e supressões antigas no produto. Em 2.1 registrar suas ocorrências sem confundir comentários e strings com sintaxe. Esse inventário só impede aumento da dívida; não dispensa uma regra habilitada nem aprova erro de lint. Trechos novos ou reescritos obedecem integralmente às restrições.

O conjunto inicial de regras deve ser explícito, coerente e delimitado antes da implementação. Remover supressões ESLint existentes e corrigir as causas necessárias para esse conjunto passar. Não exigir, por consequência automática, toda regra opcional de um preset ou uma reescrita do produto. Se as correções exigidas ultrapassarem o recorte, consultar o usuário antes de mexer na regra ou expandir o trabalho. O gate de restrições impede novas ocorrências mesmo para uma regra de tipos ainda não adotada globalmente pelo ESLint.

Formatação pode alterar espaços dos trechos históricos; o inventário deve identificar sintaxe, conteúdo e localização lógica, sem permitir novos escapes de tipo nem exigir o hash textual da etapa 1. Testar que uma ocorrência duplicada ou movida para código novo é rejeitada.
