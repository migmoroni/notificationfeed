# Estado vivo da etapa 2

**Atualizado em:** 20/11/2026.

## Situação

**Plano de engenharia preparado. Execução não iniciada. Nenhum gate da etapa 2 aprovado.**

Próxima ação, quando solicitada a execução: ler invariantes e ficha de 2.1; conferir a árvore atual; escrever/validar os testes do contrato da unidade `bootstrap`, antes de implementar o árbitro. Não iniciar por `pnpm install` ou atualização de dependências.

## Livro razão

| Fase | Estado | Evidência de execução |
| --- | --- | --- |
| 2.1 Diagnóstico e contratos | Planejada | Nenhuma |
| 2.2 Correções prioritárias | Planejada | Nenhuma |
| 2.3 pnpm | Planejada | Nenhuma |
| 2.4 Atualizações por grupo | Planejada | Nenhuma |
| 2.5 Ambiente e checks | Planejada | Nenhuma |
| 2.6 CI | Planejada | Nenhuma |
| 2.7 Consolidação | Planejada | Nenhuma |

## Decisões vigentes

- A etapa 2 trata da base técnica; a organização dos módulos passa à etapa 3.
- Manter SvelteKit/Vite, Vitest/Playwright, Tauri/Cargo, três workspaces e o pacote único. Sem reescritas ou integrações futuras.
- pnpm tem fase separada; correções urgentes precedem a conversão; atualizações posteriores são por grupo.
- ESLint/Prettier, rustfmt/Clippy, versões fixadas, comandos, diagnóstico e CI fazem parte da proposta.
- O usuário autorizou em 20/11/2026 `cargo-audit`, `@eslint/js`, `globals`, `typescript-eslint`, `eslint-plugin-svelte`, `eslint-config-prettier` e `prettier-plugin-svelte` para desenvolvimento. Nada foi instalado nesta entrega.
- [ADR 001](adr/001-escopo-e-sequencia.md) registra escopo/ordem; [ADR 002](adr/002-checks-e-evidencias.md) registra separação entre provas históricas e checks permanentes.

## Entrada conhecida

HEAD observado no planejamento: `550037cd52eefb700a96da864d07b5ee7149816c`. A proposta já tinha alterações locais; foram preservadas. A etapa 1 possui seus próprios [resultados históricos](../etapa-1-migracao-estrutural/state.md). Sua referência de hashes não equivale a uma auditoria atual da etapa 2.

O repositório ainda usa npm. Scripts E2E/unitários e gates têm vínculos com `tooling/migration`. Não há configuração ativa de lint/formatação ou CI identificada nesta inspeção. O lote Vitest fixa UTC, enquanto o watch usa a chamada direta. Vite não fixa `strictPort`; Tauri espera a porta 5173. Node de referência 22.21.1 e tipos Node 25 indicam alinhamento a revisar. Esses achados orientam 2.1, sem substituir sua medição.

## Decisões técnicas a produzir em 2.1

Versões exatas mantidas/compatíveis, relatórios atuais de segurança JS/Rust, classificação de exposição, grupos de atualização, regras/escopo de lint e matriz/versionamento da CI. São entregáveis de diagnóstico, não autorizações pendentes para as ferramentas já aprovadas.

## Limites preservados

Banco `notfeed-v2` v18; sem migração de dados. XML com DOMParser no SW e questões históricas das chaves de usuário não recebem correção implícita. Compilação/AppImage não constituem E2E nativo; o histórico registra zero testes Rust de comportamento.

## Handoff

Somente documentos/manifesto de planejamento foram criados e a proposta recebeu o vínculo ao plano. Nenhuma dependência, configuração executável ou código de produto foi alterado. Os comandos novos estão especificados para implementação nas fases indicadas, não disponíveis por efeito deste planejamento.

Validação documental: manifesto JSON, ordem e unidades das sete fases, ciclo obrigatório, políticas, links locais e `git diff --check` verificados. Isso não constitui gate de execução da etapa 2.

Ao executar, substituir este bloco por fase/unidade, passo do ciclo, arquivos tocados, checks reais, revisão/hash, evidência, impedimento concreto se houver e próxima ação. Manter o estado compacto.
