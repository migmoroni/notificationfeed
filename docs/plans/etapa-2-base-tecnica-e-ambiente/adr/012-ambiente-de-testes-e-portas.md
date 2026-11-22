# ADR 012 — Ambiente de testes e portas

**Data:** 20/11/2026. **Estado:** aprovada no gate completo 2.5/dev.

Watch e lote usarão o mesmo launcher com TZ=UTC, LANG/LC_ALL=en_US.UTF-8, preservando argumentos e código de saída. A escolha fixa apenas o processo de teste, mantendo o idioma padrão do produto. Watch é explícito, inclusive sob shell não interativo; a descoberta/configuração Vitest não muda.

O contrato permanente dev.json fixa dev 5173, preview 4173, E2E dev 4175 e strictPort. O Tauri continua alinhado a localhost:5173. O comando pwa:preview constrói antes de servir em loopback. Playwright não reutiliza servidor desconhecido e mantém origem/contexto na atualização.

As provas usarão cópia sintética: assertions de timezone/locale idênticas em lote e duas execuções watch após alteração real do arquivo. O harness encerrará somente o grupo de processos que criou, registrando o encerramento esperado. Uma porta efêmera reservada pelo próprio teste provará que Vite dev/preview falham sem migrar de porta. A configuração efetiva também deve comprovar os valores padrão fixos.

Não há nova biblioteca nem alteração de código do produto. O gate completo inclui estas provas, os testes existentes e Chromium dev/produção/atualização.

Referências: [CLI Vitest](https://vitest.dev/guide/cli.html), [strictPort Vite](https://vite.dev/config/server-options.html#server-strictport), [preview Vite](https://vite.dev/config/preview-options.html#preview-strictport).

A inspeção do preview SvelteKit confirmou que ele exige os arquivos gerados antes de tentar abrir a porta. A prova prepara esse requisito com pnpm build e testa os comandos reais do aplicativo. O build de integração/AppImage posterior continua sendo o único artefato inspecionado e servido aos testes finais; nenhuma dependência de build antigo é aceita.

Quatro provas passaram. O comando permanente dev-env executou configuração efetiva, watch/lote e ocupação real com recibo próprio; contratos de fase e lint retornaram zero. O recibo DEV-ENV integra o gate com hash do relatório. Nenhuma alteração de fonte do produto, dependência ou lock nesta unidade.
