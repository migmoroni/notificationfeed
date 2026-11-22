# ADR 018 — CI mínima web durante a organização modular

**Data:** 22/11/2026. **Estado:** escopo aprovado pelo usuário; execução e evidências em state.md. Substitui a matriz remota da ADR 014 para o escopo atual.

## Decisão e fronteiras

Adotar um único job web, sempre executado em PR, push à main e disparo manual, no Ubuntu 24.04. Instalação congelada com mise 2026.11.11, Node/pnpm já fixados; tipos, lint, formatação, fronteiras, restrições, contratos, unitários, testes dos verificadores da CI e build web obrigatórios. Sem filtro de impacto, agregador ou seleção de job desktop.

O setup:ci prepara somente as ferramentas e dependências exigidas por esse escopo. Não instala Chromium, Rust, auditor ou pacotes nativos desktop. setup:web e setup:desktop mantêm os contratos e diagnósticos locais existentes. Os limites de memória Cargo locais passam a pertencer a tools.json, sem alterar seus valores.

Gates locais de PWA/offline/atualização, segurança e desktop continuam aplicáveis às mudanças que os afetem e à consolidação técnica. Reavaliar a CI completa no fechamento da etapa 3 conforme os módulos reais. Distribuição, assinatura, atualização de instaladores e publicação exigem etapa própria posterior; nenhum formato definitivo é escolhido agora.

## Contrato, testes e aceite

C09/C10 e ci.json passam a exigir web-minimum, job web e artefato proof-web do mesmo run/attempt, com fontes/locks, versões, preparação limpa e logs verificáveis. A execução real dessa CI mínima continua obrigatória para concluir 2.6/2.7. Recibos antigos não aprovam o novo escopo.

Antes da implementação, validar o contrato e escrever provas de ausência/skip/falha do job, checks/build omitidos ou comandos extras, preparação incompleta e artefato de outro escopo. O gate de configuração passa a executar a prova limpa da CI mínima e os testes locais dos verificadores, sem recompilar Rust apenas para validar o workflow. O fechamento técnico local completo permanece na consolidação.

Quality gate: `mise exec -- node tooling/maintenance/gate.mjs 2.6 --unit configuration`. A prova limpa executa o perfil real em checkout sintético com dados/cache novos e PATH sentinela; exige locks/fontes estáveis, zero skips, ferramentas pessoais preservadas e descarte dos payloads temporários. Homologação remota somente após a publicação feita pelo usuário.
