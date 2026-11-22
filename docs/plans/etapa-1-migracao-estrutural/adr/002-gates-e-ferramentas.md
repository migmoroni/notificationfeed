# ADR 002 Gates e ferramentas

**Data:** 19 de novembro de 2026

**Status:** Protocolo solicitado pelo usuário; Playwright autorizado para desenvolvimento nesta conversa.

## Contexto

O projeto possui TypeScript estrito e Vitest/jsdom, mas não um linter de fronteiras nem testes em navegador real. A avaliação anterior identificou falhas de configuração nos testes de datas. Aprovar fases com essas falhas esconderia a situação real da migração.

## Decisão

P0 estabelece uma referência com saída zero, corrige apenas problemas delimitados de configuração de testes e cria o árbitro com Node, TypeScript e Svelte já declarados. O verificador de arquitetura recebe testes adversos e não instala um novo ecossistema de lint.

P1 adiciona `@playwright/test` exclusivamente como dependência de desenvolvimento, conforme autorização expressa do usuário, para provar os contratos web/PWA. A versão fica fixada no lockfile. Outra biblioteca ou driver exige consulta prévia.

Tipagens e supressões históricas são inventariadas por trecho para permitir movimentação sem limpeza geral; novas ocorrências são proibidas. Testes falhos, ignorados ou não executados nunca recebem aprovação por esse inventário.

## Consequência

Gates técnicos são automáticos e exigem saída zero. O orçamento de testes acompanha o impacto, com verificação completa no encerramento. Falha estrutural ou pré-requisito ausente bloqueia o recorte. Playwright comprova o navegador; os checks Tauri comprovam compilação e empacotamento, sem alegar E2E nativo inexistente.

