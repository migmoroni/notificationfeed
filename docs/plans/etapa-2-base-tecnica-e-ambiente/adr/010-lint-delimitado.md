# ADR 010 — Lint delimitado

**Data:** 20/11/2026. **Estado:** 2.5/lint aprovada em gate completo.

Adotar somente as regras de correção selecionadas em 2.1 e no-undef para JS, com zero avisos, noInlineConfig e todas as fontes ativas. O contrato permanente é tooling/checks/contracts/lint.json; maintenance mantém o registro da seleção. ESLint/suporte são os seis pacotes já autorizados e fixados em updates.json; Prettier/plugin entram apenas na unidade format.

Usar @eslint/js como origem do subconjunto de regras acordado, typescript-eslint como parser de TS e o parser fornecido pela configuração base de eslint-plugin-svelte. Não importar regras opcionais de presets. eslint-config-prettier compõe a configuração desde a adoção, preservando exatamente as regras de correção; testes conferem os níveis efetivos. Não desabilitar regra após diagnóstico.

Separar globais Node, navegador e service worker; o check TypeScript/Svelte continua cobrindo os arquivos tipados. Provas anteriores à implementação exigem descoberta/configuração de JS, TS, Svelte/runes e worker, rejeição de debugger, separação de window/process e supressão incapaz de esconder erro. Remover diretivas ESLint existentes e corrigir causas pontuais. Clippy usa o alvo/feature atual com --all-targets e -D warnings; nenhum --all-features ou allow novo.

Se um diagnóstico exigir refatoração ampla de produto, parar e consultar; não ampliar o conjunto de regras nem abrir exceção para encerrar. Instalação modifica o lock JS, portanto o gate desta unidade é Completo, acrescido de LINT/CLIPPY. Formatação permanece separada.

Fontes: [ESLint flat config](https://eslint.org/docs/latest/use/configure/configuration-files), [plugin Svelte](https://sveltejs.github.io/eslint-plugin-svelte/user-guide/). Metadados oficiais e grafo de entrada em .artifacts/maintenance/2.5/lint/input.

As seis ferramentas foram instaladas nas versões selecionadas. Materialização congelada sincronizou os links dos workspaces exigidos pelo pnpm; nenhuma política foi desligada. Configuração usa os parsers da base Svelte sem suas regras opcionais, e o subconjunto @eslint/js com os níveis explícitos. eslint-config-prettier vem antes das regras de correção; os testes verificam que todas permanecem em error. JS, TS, Svelte/runes e worker são descobertos e as provas de globais/supressão passaram. Removidas três diretivas ESLint; lint integral retornou zero sem outra mudança de produto.

Clippy recusou um while-let sobre o iterador de baterias. Troca local para for e remoção de mut preservam os mesmos resultados, tratamento de erros, retornos e limites; sem allow ou refatoração de negócio. Clippy --all-targets/-D warnings passou. Delta de 95 nós/195 arestas contém só ferramentas e transitivas, com caminhos das raízes autorizadas; nenhum nó/aresta anterior removido e Cargo.lock preservado. Auditoria sem novo advisory/versão; política atual aprovada. Sessenta provas Node, tipos Svelte/worker e lint integral passaram; gate completo obrigatório antes da unidade format.

Gate completo aprovado: .artifacts/maintenance/2.5/lint/2026-11-20T23-45-06.569Z-b2a4b561-9a2b-435e-8d51-1fc1fd471da5/evidence.json. Sessenta provas Node, checks/tipos, ESLint/Clippy, 207 testes, segurança, Cargo/AppImage e Chromium 1/3/3 passaram sem skips ou relaxamentos.
