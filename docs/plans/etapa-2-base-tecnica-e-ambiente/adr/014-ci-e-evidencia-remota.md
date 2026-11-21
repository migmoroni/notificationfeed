# ADR 014 — CI e evidência remota

**Data:** 20/11/2026. **Estado:** configuration aprovada; conferidor de execution em validação local, CI remota pendente.

GitHub Actions usa os comandos permanentes aprovados em 2.5, runner Ubuntu 24.04 e actions por revisão completa. Node/pnpm/Rust/auditor continuam exatos. Permissões contents:read, sem segredos em PR, deploy, publicação de pacote/AppImage ou mudanças de proteção de branch.

ci.json fixa workflow, jobs, ferramentas e recibos. Impacto somente documental recebe links/diff; código/configuração/contratos/locks/ferramentas ou histórico ausente acionam todos os consumidores. O pedido workflow_dispatch full ou o marcador <!-- notfeed-ci:full --> no corpo do PR só pode aumentar verificações. A qualificação desta etapa sempre exige os quatro jobs aprovados. O agregador roda com always e recusa falta, skip obrigatório, falha ou cancelamento.

A impressão digital inclui fontes/configurações/contratos/locks com paths relativos; exclui gerados e somente ledgers docs/**/state.md. Estado mutável de execução não altera o código auditado. Alteração de fonte executável, contrato, workflow ou documentação restante exige nova evidência. Recibos e checkpoints são saídas em .artifacts, evitando hashes circulares no código.

Web executa verify:quick e test:tooling. Desktop executa verify:integration, mantendo build/inspeção antes do navegador e nenhuma publicação do AppImage. Preparação é explícita: pnpm congelado e scripts autorizados, bootstrap HTTPS/SHA256 em cache novo, Chromium fixado e bibliotecas atuais. Cache pnpm usa locks/toolchains/OS; não armazena node_modules nem substitui instalação. Target Cargo fica sem cache remoto; duas tarefas e ausência de debug info/incremental reduzem consumo de recursos sem mudar features, tipos, assertions ou verificações.

O recibo remoto será conferido no serviço: run/attempt/event/revisão real, jobs e artefatos recuperáveis. Diferenciar head do PR e checkout de merge. Validar fonte/contratos/locks equivalentes e hashes dos arquivos de prova; YAML ou relato manual não aprovam 2.6/execution. Configuração e gate locais precedem eventual consulta por autorização remota ausente.

O repositório não tinha workflows e a branch atual não tinha PR aberto na consulta somente leitura. A documentação GitHub condiciona o primeiro workflow_dispatch à presença/registro do workflow; um PR permite a primeira execução sem merge em main. Publicação e PR só ocorrerão dentro da autorização explícita aplicável.

Referências: [eventos GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [setup-node](https://github.com/actions/setup-node), [upload-artifact](https://github.com/actions/upload-artifact).

YAML validado pela AST do parser incluído no Prettier já autorizado, com esquema restrito que rejeita duplicatas/aliases/tags; nenhuma biblioteca adicional. Parser TAP ativo movido para checks e compartilhado com o árbitro, sem reexport/alias. Provas adversas e política de pins/cache passaram. Perfil web local concluiu 47 testes e manifesto com fontes estáveis; event=local/runId=0 impede tratar essa prova como CI real.

Configuration passou no gate completo com 82 provas Node e integração 1/3/3. Execution usa metadados atuais do serviço, ZIP/digest e manifestos extraídos; ausência de recibo é recusada antes da instalação. gh 2.46.0 existente exige paginação explícita, testada contra truncamento/duplicatas. Perfis locais repetidos identificaram arquivos antigos no espelho; execução em diretório único e cópia atual corrigiram a causa, preservando histórico e critério estrito de arquivos extras. Nenhuma prova local é convertida em status remoto.
