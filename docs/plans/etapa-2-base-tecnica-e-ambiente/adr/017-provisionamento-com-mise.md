# ADR 017 — Provisionamento por projeto com mise

**Data:** 21/11/2026. **Estado:** inclusão no plano solicitada pelo usuário; implementação e gates pendentes.

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

As aprovações anteriores de 2.5/2.6 permanecem históricas. A integração deve distinguir os contratos antigos do novo requisito PROVISION; requalificar o fechamento 2.5 e a configuração 2.6, depois obter CI real e consolidar 2.7. O plano não declara mise instalado ou esse fluxo aprovado.
