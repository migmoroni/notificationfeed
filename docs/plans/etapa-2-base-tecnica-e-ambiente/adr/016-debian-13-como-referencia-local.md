# ADR 016 — Debian 13 no desenvolvimento e Ubuntu na CI

**Data:** 21/11/2026. **Estado:** decisão aprovada pelo usuário; implantação do provisionamento com mise pendente.

## Contexto

O usuário desenvolve em Debian 13 (trixie) e solicitou padronizar o ambiente nessa distribuição. O projeto mantém web/PWA e Tauri Linux x86_64. As versões das ferramentas já são exatas, mas sua preparação ainda depende de instalação manual. O workflow existente usa Ubuntu 24.04.

## Decisão

Adotar Debian 13 x86_64 como referência de desenvolvimento local e orientar a preparação das bibliotecas nativas para essa distribuição. A seleção automática das ferramentas via mise é o encaminhamento da etapa 2; esta ADR não declara sua implementação ou validação concluída. Preservar os pins atuais e a autoridade de rust-toolchain.toml sobre a versão e os componentes Rust. A preparação web continua independente de Rust/GTK.

Docker não é requisito do desenvolvimento local. Se for adotado futuramente, usar imagem Debian com versão explícita e digest fixado, além da receita das dependências de sistema. Uma imagem Debian não reproduz automaticamente todos os pacotes instalados na máquina do usuário.

Manter Ubuntu 24.04 nos runners hospedados do GitHub para a CI. O usuário confirmou que Debian no desenvolvimento e Ubuntu na CI são adequados. Ambos devem usar as mesmas versões exatas das ferramentas e os mesmos comandos de validação, com preparação das bibliotecas de sistema por distribuição. Não introduzir Docker ou runner próprio nesta etapa. A escolha dos sistemas está encerrada.

## Alternativas e limite da CI

O GitHub não oferece Debian entre os runners padrão hospedados. Foram consideradas as alternativas de executar jobs em contêiner Debian ou manter um runner próprio Debian. O usuário escolheu preservar o runner Ubuntu existente, validando outro ambiente Linux sem acrescentar infraestrutura de execução.

O encaminhamento é padronizar os comandos e as versões com mise, validar o ambiente local Debian e executar a CI em Ubuntu antes da consolidação da etapa 2. A [ADR 017](017-provisionamento-com-mise.md) e a [unidade 2.5f](../fases/2.5f-provisionamento-com-mise.md) detalham essa adoção. A CI comprova execução em Ubuntu e complementa as provas locais em Debian; não garante igualdade de bibliotecas entre as distribuições. A CI real continua pendente; não substituir sua prova por execução local.

## Consequências e validação

Preparar contrato e provas de instalação limpa, seleção das versões efetivas e diagnóstico por alvo antes da implementação. Reexecutar os gates afetados e registrar a distribuição efetiva nas evidências. Os recibos anteriores permanecem históricos.

Debian 13 é a referência de desenvolvimento, não uma declaração de suporte exclusivo do produto ou de compatibilidade com todo Linux. Compilar AppImage nessa base pode elevar o requisito mínimo de glibc; a matriz de distribuição precisa ser validada separadamente. O foco atual web/PWA é preservado.

Fontes: [runners hospedados do GitHub](https://docs.github.com/en/actions/reference/runners/github-hosted-runners), [jobs em contêiner](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container), [limitações de AppImage no Tauri](https://v2.tauri.app/distribute/appimage/).
