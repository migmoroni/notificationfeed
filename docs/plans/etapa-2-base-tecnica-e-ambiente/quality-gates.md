# Quality gates da etapa 2

## Árbitro e início da execução

Implementar em 2.1a um árbitro pequeno em Node, com `node:test` e `node:assert`, seguindo os contratos e as provas adversas antes de qualquer mudança de produto. Não instalar framework novo para isso.

Interface prevista, executada da raiz:

```sh
node --test tooling/maintenance/tests/contracts.test.mjs
node --test tooling/maintenance/tests/arbiter.test.mjs
node tooling/maintenance/check.mjs --phase 2.1 --unit bootstrap
node tooling/maintenance/gate.mjs 2.1 --unit bootstrap
```

Os primeiros arquivos a escrever são os testes do manifesto e os testes de falha do árbitro. Antes de o árbitro existir, executar esses testes diretamente: a falha esperada comprova a ausência/incorreção da implementação, não a aprovação da fase. Só implementar o executor depois da validação dos contratos e da revisão dos casos de teste.

O árbitro aceita apenas fases/unidades declaradas. A lista de checks e comandos é fixa por contrato; é proibido escolher checks menores após observar falha. O parâmetro `--unit` recorta uma unidade prevista, sem aprovar a fase inteira. O comando sem `--unit` executa o gate de saída da fase e verifica seus recibos internos.

Não colocar `npm run gate:migration -- P6` no caminho de aprovação desta etapa. Ele protege premissas históricas incompatíveis com as mudanças autorizadas de versões e gerenciador. Manter seus comprovantes, sem adulterar as expectativas antigas.

## Comandos e condições de aprovação

Na tabela, `<pm>` é `npm run` até 2.2 e `pnpm` a partir de 2.3. O executor materializa o binário e os argumentos; não executa a expressão literal. Quando um comando novo ainda não estiver implantado, a fase declara sua introdução antes de torná-lo obrigatório. Comando obrigatório ausente é falha, nunca um skip.

| ID        | Terminal e prova exigida                                                                                                                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CONTRACT  | `node tooling/maintenance/check.mjs --phase <fase>`; manifesto, registros, versões, grupos, predecessor e escopo coerentes                                                                                                          |
| ARBITER   | `node --test tooling/maintenance/tests/*.test.mjs`; descoberta não vazia, casos adversos executados                                                                                                                                 |
| TYPES     | `<pm> check` e `<pm> check:e2e`; zero erros e avisos, pacote inteiro coberto                                                                                                                                                        |
| UNIT      | `<pm> test:run`; zero falhas, ignorados ou instáveis; identidades preservadas segundo baseline                                                                                                                                      |
| BOUNDARY  | `node tooling/checks/architecture.mjs` e `node tooling/checks/restrictions.mjs`; entram completos em 2.5a; antes disso, CONTRACT inspeciona os mesmos limites necessários à fase                                                    |
| BUILD     | `<pm> build`; artefatos, rotas, manifest e SW esperados presentes                                                                                                                                                                   |
| BROWSER   | `<pm> test:e2e:dev` e `<pm> test:e2e`; cenários DEV/WEB/PWA, Chromium fixado, zero falhas/skip/flaky, controlador real                                                                                                              |
| UPGRADE   | `<pm> test:e2e:upgrade`; referência reconstruída de entrada → candidato, mesma origem/contexto, dados e offline preservados                                                                                                         |
| INSTALL   | `node tooling/maintenance/install.mjs`; materializa cópia isolada e executa `npm ci` ou `pnpm install --frozen-lockfile`, verificando integridade/imutabilidade e resolução local                                                   |
| SECURITY  | `node tooling/maintenance/security.mjs --phase <fase>`; coleta atual e política daquela fase, ambos válidos; contratos de atualização também indicam a unidade                                                                      |
| NATIVE    | `cargo check --locked --manifest-path apps/desktop/src-tauri/Cargo.toml` e `cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml`; relatório distingue zero testes de cobertura real                               |
| BUNDLE    | `<pm> tauri:appimage` e `node tooling/checks/bundle.mjs`; verificador independente preparado em 2.1b inspeciona executável/recursos atuais, sem modificar contratos históricos                                                      |
| LINT      | `pnpm lint`; ESLint com `--max-warnings 0`, sem supressões; `cargo clippy --locked --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings` no perfil desktop                                                |
| FORMAT    | `pnpm format:check` e `cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml -- --check`; verificação sem alterações                                                                                                          |
| ENV       | `pnpm run doctor --target web`, `pnpm run doctor --target desktop` e `pnpm test:tooling`; pré-requisitos, ambiente, watch/lote e portas incluindo provas negativas                                                                  |
| PROVISION | Previsto em 2.5/provision: `mise exec -- node tooling/checks/provision.mjs check` e `prove --target web`/`prove --target desktop`; bootstrap, seleção efetiva, instalação limpa e reexecução, com recibos ligados à execução atual. |
| CI        | `node tooling/maintenance/check-ci.mjs --receipt <arquivo>`; recibo de execução real, identidade do código e todos os jobs requeridos aprovados                                                                                     |
| DIFF      | `git diff --check` e auditoria do escopo/arquivos não rastreados; sem alteração de fontes/locks pelo gate                                                                                                                           |

`BUNDLE` usa um build web que o hook Tauri pode regenerar. Nos gates completos, executar o empacotamento e a inspeção **antes** de BROWSER/UPGRADE; estes validam o mesmo build web final extraído/inspecionado. Registrar a identidade e os hashes dos assets. Não construir novamente entre essa inspeção e a prova final de navegador.

Quando o gate inclui INSTALL, executar as verificações dos consumidores no mesmo candidato instalado em isolamento, com fontes/contratos iguais pelos hashes. Uma instalação limpa em uma pasta e testes sobre `node_modules` antigo em outra não satisfazem o contrato. O executor registra o cwd real de cada comando e copia somente os recibos para a área de evidências. A referência PWA é reconstruída em outra área, com seu próprio lock e ambiente, sem contaminar o candidato.

PROVISION é uma ampliação planejada, ainda não disponível no executor. Sua adoção exige os testes da [unidade 2.5f](fases/2.5f-provisionamento-com-mise.md) e C11 antes da implementação. Integrar sua prova de instalação ao candidato de INSTALL quando equivalente, sem duplicar checkouts/toolchains. Os comandos cotidianos e de CI passam a ser executados com `mise exec`/`mise run`, preservando os executáveis/argumentos e os critérios dos checks existentes.

O baseline PWA novo e os comandos de atualização são preparados em 2.1b. Em 2.1b, UPGRADE faz a prova de procedimento com dois builds distinguíveis da referência e um snapshot semântico; nas fases seguintes compara a referência fixa com o candidato. Também deve detectar sentinela ausente e controlador ausente. O histórico P1 continua reproduzível por sua receita; a rotina desta etapa usa a receita própria de entrada, com ferramentas históricas provisionadas em isolamento apenas para reconstruir a referência.

## Perfis e seleção por impacto

| Perfil   | Conteúdo                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------- |
| Base     | CONTRACT, ARBITER, TYPES, UNIT, DIFF; BOUNDARY desde 2.5a                                                |
| Web      | Base + BUILD, BROWSER, UPGRADE                                                                           |
| Desktop  | Base + BUILD, NATIVE, BUNDLE; inspeção do frontend e smoke web quando houver regeneração dele            |
| Completo | Base + INSTALL, SECURITY, NATIVE, BUNDLE, BROWSER, UPGRADE; LINT/FORMAT/ENV após suas unidades de adoção |

Após a adoção de 2.5/provision, o perfil Completo acrescenta PROVISION; checks rápidos cotidianos validam a coerência/versões sem reinstalar o ambiente. As provas completas de provisionamento são locais; a CI mínima possui sua própria preparação limpa para os checks web, sem repetir stack desktop/PWA.

Até 2.5, a implantação gradual de lint/formatação/diagnóstico é explícita no manifesto; não é dispensa de uma regra já obrigatória. A referência funcional da etapa 2 é estabelecida antes de atualizar o produto.

| Mudança                                                                                                | Perfil mínimo obrigatório                                                                                 |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Lock JS/TS, gerenciador, runtime Node, build compartilhado, contrato de gates ou dependência do pacote | Completo                                                                                                  |
| mise.toml, mise.lock, bootstrap/setup, contrato C11 ou seleção de ferramentas                          | Completo + PROVISION após adoção; CI mínima web sempre executada; consumidores completos continuam locais |
| App web, rotas, SW, Workbox, UI ou dados locais                                                        | Web; Desktop também se alterar artefato consumido pelo Tauri                                              |
| Cargo.lock/crates/toolchain, CLI/plugin Tauri, permissões/configuração desktop                         | Desktop + SECURITY; Web se alterar build ou consumidor JS compartilhado                                   |
| Regras de lint/formatação, utilidade de teste ou tooling                                               | Base + testes adversos dessa ferramenta; acrescentar consumidores que ela executa                         |
| Documentação sem efeito executável                                                                     | Links, manifesto quando afetado e DIFF                                                                    |
| Impacto desconhecido ou múltiplas categorias                                                           | União dos perfis; se a fronteira for ambígua, Stop & Ask                                                  |

A matriz acima orienta os gates locais. Pela revisão de escopo da ADR 018, a CI remota executa sempre um único job web com todos os dez checks de web-minimum, sem filtro de impacto/agregador. Cancelado, omitido, pulado ou falho reprova. 2.6/execution e 2.7 exigem a CI mínima real; o conjunto local completo permanece nos fechamentos aplicáveis. Revisar a CI ampliada no fechamento da etapa 3.

## Gates de saída das fases

| Fase | Comando final                           | Exigência                                                                                                                              |
| ---- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | `node tooling/maintenance/gate.mjs 2.1` | Bootstrap e diagnóstico aprovados; perfil Completo de referência com npm, política de inventário de segurança, versões/grupos fechados |
| 2.2  | `node tooling/maintenance/gate.mjs 2.2` | Base, SECURITY e união dos perfis dos riscos tratados; ausência de urgentes comprovada inclusive quando não houver edição              |
| 2.3  | `node tooling/maintenance/gate.mjs 2.3` | Completo com pnpm; comparação de resolução sem delta inexplicado; apenas pnpm-lock ativo                                               |
| 2.4  | `node tooling/maintenance/gate.mjs 2.4` | Todos os grupos aprovados, perfil Completo e política final de segurança                                                               |
| 2.5  | `node tooling/maintenance/gate.mjs 2.5` | Todas as unidades aprovadas, incluindo provision após adoção; Completo + PROVISION e independência dos gates antigos                   |
| 2.6  | `node tooling/maintenance/gate.mjs 2.6` | Configuração validada e CI mínima web real, contrato/commit/hashes equivalentes                                                        |
| 2.7  | `node tooling/maintenance/gate.mjs 2.7` | Completo local + CI mínima web, documentação coerente, checkpoint reconstruível e handoff                                              |

Em 2.4 cada grupo executa `node tooling/maintenance/gate.mjs 2.4 --unit <id-registrado>`. O fechamento exige resultados de todos os grupos, sem reutilizar testes antigos como prova de fontes alteradas. Unidades seguintes podem usar um predecessor histórico aprovado; o fechamento testa a integração atual. Evitar repetições adicionais sem alteração, falha ou dúvida concreta além dos gates exigidos.

Na ampliação mise, executar via mise o gate da unidade provision e o novo fechamento 2.5, depois revalidar 2.6/configuration. A leitura dos predecessores deve conservar o contrato de checks anterior, sem exigir PROVISION retroativamente. O fechamento novo precisa exigir PROVISION; testar a recusa de recibo antigo usado como aprovação atual. Nenhuma alteração de hash ou resultado histórico é permitida.

## Provas adversas mínimas

Criar fixtures pequenas fora do produto para provar o comportamento dos verificadores:

1. Processo com exit não zero, sinal, timeout, ferramenta inexistente e log/relatório inválido nunca aprova.
2. Fase fora de ordem, unidade desconhecida, contrato alterado, recibo velho apresentado como atual e fonte alterada durante o gate são recusados.
3. Import proibido em TS/Svelte/dinâmico/de tipo, pacote ausente e dependência não declarada são detectados; glob não pode omitir arquivo ativo não importado por rota.
4. Lock modificado pela instalação, resolução externa do produto e peer incompatível falham. A prova roda também em instalação limpa.
5. Advisory bloqueante, desconhecido, prazo vencido, relatório incompleto ou falha de rede reprovam; finding comprovadamente não aplicável conserva sua justificativa e rastreabilidade.
6. Caso unitário removido/ignorado, sentinela IndexedDB perdida, SW ausente ou build antigo ainda ativo reprovam.
7. Diagnóstico de alvo web passa sem Rust/GTK; alvo desktop reprova quando requisito necessário falta. Porta ocupada produz falha explícita; o harness valida essa falha, sem convertê-la em sucesso do servidor.
8. Job CI obrigatório omitido, run de outro commit, artefato divergente e falha mascarada por `continue-on-error` não aprovam o recibo.
9. No provisionamento, checksum inválido, lock ausente/divergente, versão global incompatível ou runtime do pnpm diferente do Node fixado não aprovam. Demonstrar seleção por projeto sem alterar defaults externos, setup web sem stack desktop e execução sem shell interativo.
10. A integração mise recusa fechamento novo sem PROVISION, conserva a validação dos recibos históricos pelos contratos correspondentes e mantém a referência PWA em seu ambiente histórico isolado.

Fixtures inválidas não entram no build do produto. Não escrever testes que apenas espelhem uma string da implementação quando for possível provar resolução, processo ou comportamento real. Não criar uma plataforma de testes nova: usar Node, Vitest e Playwright já disponíveis/autorizados.

## Limites da aprovação

Chromium prova web/PWA. Cargo, Clippy e inspeção AppImage provam compilação, regras e empacotamento do alvo Linux existente; não provam WebView, notificações do SO ou novos alvos. XML via DOMParser no SW e as questões históricas de chaves de usuário continuam fora das correções declaradas, salvo decisão explícita. Uma falha em fluxo **coberto** continua bloqueante, mesmo se preexistente.

O gate 2.6/configuration da revisão mínima executa contrato/YAML, verificadores locais e CI-PROVE (checkout limpo com os dez checks). O gate técnico local completo permanece em 2.5/2.7 e nas mudanças que o exigirem; validar apenas o workflow não exige reconstruir o desktop.
