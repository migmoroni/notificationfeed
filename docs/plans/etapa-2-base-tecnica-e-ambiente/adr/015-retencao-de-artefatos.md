# ADR 015 — Retenção de artefatos locais

Data: 20/11/2026. Estado: adotada, com gate local completo aprovado. CI real permanece pendente.

## Problema e fronteiras

Gates deixam instalações isoladas, caches de download, clones RustSec, extrações AppImage e reconstruções históricas após concluir. O diagnóstico encontrou 67 GiB em `.artifacts`, dos quais 54 GiB em candidatos. Esses diretórios são produtos reproduzíveis, não a evidência de aprovação.

O contrato permanente é `tooling/checks/contracts/artifacts.json`. `checks/artifacts-lib.mjs` depende somente de APIs Node e `checks/io.mjs`; produtores permanentes e o executor de manutenção podem consumi-lo. Não há dependência inversa de checks para manutenção. Nenhuma biblioteca adicional.

## Invariantes

- Preservar recibos, stdout/stderr, logs, relatórios, hashes, fontes dos candidatos, arquivos de checkpoint e ferramentas executáveis atuais. Não modificar provas históricas para justificar exclusões.
- Remover apenas caminhos regeneráveis enumerados no contrato, dentro do `.artifacts` da execução. Rejeitar caminhos externos e componentes simbólicos, sem seguir links durante exclusões.
- Instalações continuam novas, frozen, com caches inicialmente vazios, scripts ativos e repetição offline. Limpeza ocorre depois das verificações e gravação dos recibos, inclusive em falha.
- Operações em curso registram leases. A limpeza manual recusa qualquer lease ativo, sem supor que um PID de outro sandbox esteja morto. Após interrupção abrupta, inspecionar a execução antes de remover manualmente o lease órfão.
- Não remover cache de compilação Rust automaticamente a cada gate. O comando de limpeza pode descartá-lo explicitamente; ferramentas instaladas e bundles de checkpoint permanecem.
- Limpeza não aprova gate, não altera fontes/locks e não substitui CI real. Commit, push e envio à main ficam a cargo do usuário.

## Ciclo e árbitro

Contrato → testes adversos (fronteira, symlinks, lease, falha, idempotência e integridade de recibos) → implementação mínima → testes do tooling, lint, formatação e `verify:quick`. Conferir recibos aprovados antes/depois da limpeza real e medir disco. Testar também uma reconstrução histórica real e a remoção de seus temporários após produzir build/evidência.

## Consequências

Os logs compactos continuam cumulativos para auditoria; dependências, downloads e extrações deixam de acumular por execução. Uma compilação Rust ainda ocupa vários GiB em um cache reutilizado, que pode ser liberado pelo comando explícito. Reexecutar um candidato compactado exige nova instalação; a recuperação de código utiliza os checkpoints preservados.
