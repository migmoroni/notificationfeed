# ADR 017 — Provisionamento por projeto com mise

**Revisão de escopo:** a [ADR 018](018-ci-minima-web.md) substitui a matriz CI remota anterior; o histórico abaixo permanece como registro das decisões e provas anteriores.

**Data:** 21/11/2026. **Atualização:** 22/11/2026. **Estado:** revisão para mise 2026.11.11 e instalação pessoal no PATH; requalificação local em andamento, conforme state.md.

## Contexto

As versões exatas já são exigidas, mas o setup ainda depende de instalações manuais. A flexibilização do pnpm foi descartada a pedido do usuário. A ADR 016 fixou Debian 13 no desenvolvimento e Ubuntu 24.04 na CI. O usuário solicitou incorporar mise ao plano da etapa 2.

## Decisão e fronteiras

Acrescentar a unidade [2.5/provision](../fases/2.5f-provisionamento-com-mise.md), regida por C11, antes de revalidar a configuração CI e concluir a etapa. Instalar mise com versão/integridade exatas e usar configuração do projeto e mise.lock para preparar Node/pnpm nos pins atuais. Selecionar o próprio mise no início da unidade, após conferir a distribuição oficial e as capacidades exigidas; não atualizar as demais ferramentas junto da adoção.

As instalações usuais ficam no usuário, fora do repositório, com reutilização entre projetos. A seleção é local ao projeto/processo; não trocar defaults globais, remover ferramentas pessoais ou editar o shell automaticamente. Os testes de isolamento usam diretórios temporários próprios e não reatribuem HOME.

Separar setup web de desktop. Rust permanece sob rustup/rust-toolchain.toml; cargo-audit é instalado com Cargo em prefixo próprio da versão. Bibliotecas nativas são pré-requisitos do SO. O mise prepara o ambiente e chama os comandos existentes, sem assumir dependências pnpm/Cargo, duplicar gates ou instalar bibliotecas dentro do doctor.

Usar o mesmo bootstrap e as mesmas declarações na CI Ubuntu, com execução explícita sem shell interativo. Manter a política de engines/pnpm exatos. O caminho cotidiano deixa de depender de ferramentas em `.artifacts/toolchains`; histórico e receitas de reconstrução são preservados.

## Alternativas consideradas

Instalações globais manuais mantêm o atrito observado. nvm/Corepack forneceriam outro caminho de seleção para Node/pnpm, porém o fluxo escolhido concentra o provisionamento do projeto no mise. Docker e runner próprio foram excluídos da etapa pela decisão da ADR 016. Não manter caminhos oficiais concorrentes de preparação.

## Consequências e aceite

A adoção acrescenta bootstrap, configuração/lock e uma unidade de provas, sem mudanças no produto. C11 define responsabilidade dos pins, integridade, perfis, execução efetiva e retenção. A prova usa checkout limpo, PATH adverso, outro projeto, shell não interativo e repetição do setup sem alterar locks. O perfil web não exige stack desktop.

As aprovações anteriores de 2.5/2.6 permanecem históricas. A integração deve distinguir os contratos antigos do novo requisito PROVISION; requalificar o fechamento 2.5 e a configuração 2.6, depois obter CI real e consolidar 2.7. As evidências da execução e de cada revisão ficam em state.md.

## Seleção e prova inicial — 22/11/2026

Selecionado mise 2026.11.12 Linux x64, SHA256 `9c12c24f5eac6b6357e5265e2629166cc3005459037f5d747680a99e375ff2ab`, conferido pela API e SHASUMS oficiais. O backend core:node lê .nvmrc por template; npm:pnpm lê packageManager por template e usa o instalador aube incorporado no binário mise. Não há outro executável de gerenciador para instalar o próprio pnpm. mise.lock v4 e seus dois sidecars fixam os artefatos/grafo. C11 registra os hashes desses arquivos; não há novas versões do produto.

A pesquisa demonstrou que um erro de resolução do lock pode ser apenas aviso em mise exec, permitindo continuar pelo PATH. Por isso, além de tool_config.locked e checksum obrigatório, o ambiente declarativo verifica os pins e SHA256 do lock/sidecars com funções internas de template, antes de iniciar qualquer comando. Não executa subprocessos para essa verificação. As provas reais recusam lock ausente, pin, plataforma, checksum e sidecar divergentes, mesmo com ferramentas instaladas. Essa proteção também vale para tarefas.

Bootstrap e seleção por usuário já executados. A primeira prova web limpa passou com caches vazios, sentinelas externas, outro projeto, reexecução independente de históricos e verify:quick com 207 unitários. É diagnóstico da implementação inicial; o aceite da unidade e o novo fechamento exigem os gates completos das fontes finais. Os recibos históricos de 2.5/final e 2.6/configuration têm hashes registrados, sem reescrita; não satisfazem a nova exigência PROVISION.

A auditoria detectou que rustup toolchain install pode atualizar o próprio gerenciador. O setup deve usar --no-self-update, sem alterar a configuração global auto-self-update. A versão pessoal anterior 1.29.0 foi restaurada por binário oficial verificado; a prova agora compara também o executável rustup pessoal antes/depois e os argumentos efetivamente executados. Recibos da tentativa interrompida não aprovam a unidade.

## Revisão da instalação do gerenciador — 22/11/2026

O usuário removeu a instalação específica anterior e instalou mise 2026.11.11 em ~/.local/bin/mise, disponível no PATH. Adotar essa versão exata em desenvolvimento e CI. SHA256 oficial Linux x64: `be6f46a4cc3d5532acf359f163cf7ce80ceb43e5718d7b9049165a340fb02e2d`; SHASUMS256.txt: `acae2c0d4b40125fee075065c5dfd7af82e2be16a3f3b2cbe7bea3451d50fc03`. Origem: [release oficial](https://github.com/jdx/mise/releases/tag/v2026.11.11).

O bootstrap local apenas localiza e valida o mise no PATH: ausência, versão ou integridade divergentes reprovam sem download, instalação ou substituição. O gerenciador é pré-requisito pessoal e sua ativação é manual; as ferramentas continuam selecionadas por mise.toml. CI e provas limpas usam explicitamente `--install-dir <diretório absoluto temporário>` para obter o mesmo binário verificado, sem tocar na instalação pessoal. Não há destino de instalação implícito. Preservar Node/pnpm/Rust/auditor, locks do produto, ferramentas e shell pessoais. Revalidar lock v4/aube, contratos, testes de provisionamento e CI; recibos anteriores continuam históricos e não aprovam esta revisão.
