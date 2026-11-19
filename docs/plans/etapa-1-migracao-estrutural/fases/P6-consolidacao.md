# P6 — Reprodutibilidade e encerramento da etapa 1

**Entrada:** P5 aprovado; todas as fases anteriores possuem evidências e checkpoints.

**Contexto necessário:** [state.md](../state.md), [invariantes](../invariantes-e-fronteiras.md), contratos, manifests/lockfiles, documentação de desenvolvimento e resultados dos gates. Revisar fontes adicionais somente por indicação do diff ou de uma falha.

## 1. Especificação

Confirmar que a única estrutura ativa pode ser instalada, verificada e empacotada a partir do repositório e de suas dependências declaradas. Encerrar a migração estrutural sem iniciar a organização dos módulos da etapa 2.

Não aproveitar a consolidação para limpeza geral, redesign, upgrades ou novas funcionalidades.

## 2. Contrato/Schema

Definir a lista final de fontes/configurações permitidas e os comandos públicos de desenvolvimento. Registrar como reproduzir a referência P1 a partir de seu checkpoint se o artefato temporário não existir. Essa reprodução acontece em área de teste isolada, sem reintroduzir fonte antiga na aplicação ativa.

O gate final não depende de arquivo pessoal, cache npm obrigatório, configuração não versionada ou diretório antigo. Dependências e navegadores podem precisar de download conforme as versões declaradas; falha de acesso é registrada como bloqueio, sem fingir instalação reproduzida.

Definir o conjunto de documentos a atualizar e os campos finais de `state.md`. O encerramento exige todos os checks completos sobre o mesmo estado auditado.

```sh
npm run check:contracts -- --spec P6
```

## 3. Teste

Preparar a verificação final de estrutura única: rejeitar raízes antigas, aliases de compatibilidade, fontes duplicadas, dependências não declaradas, testes omitidos e mudanças de dados protegidos. Confirmar que scripts documentados resolvem os workspaces corretos.

Planejar a instalação sem aproveitar saídas antigas de build. Limpeza se restringe a artefatos gerados identificados; nunca usar limpeza ampla do Git ou apagar alterações/dados do usuário. Uma reprodução isolada deve incluir a revisão exata auditada, sem perder arquivos ainda não commitados.

## 4. Implementação mínima

- Corrigir somente referências documentais, arquivos de configuração substituídos e defeitos estruturais identificados pela auditoria.
- Atualizar instruções de instalação, desenvolvimento, testes, PWA e desktop com caminhos e comandos reais.
- Remover material operacional obsoleto, preservando o histórico de decisões como histórico e mantendo uma única implementação ativa.
- Preparar o resumo de evidências e limitações de cobertura para o estado final.

Qualquer mudança de contrato retorna à validação e aos testes correspondentes; não acomodar falhas alterando o gate final.

## 5. Quality Gate

```sh
npm run gate:migration -- P6
```

**Aceite:** o runner executa `npm ci`, valida que o lockfile não mudou, e executa contratos, arquitetura, testes do árbitro, check completo, Vitest, build, Playwright completo incluindo P1 → build final, cargo check/test e empacotamento/inspeção de P5. Tudo retorna zero. `git diff --check` passa; a inspeção documental também inclui os arquivos novos ainda não rastreados.

Auditar novamente versões, identidade dos testes, grafo, exports, assets, dados protegidos e ausência de fontes antigas. Uma verificação que passou antes de uma alteração relevante deve ser repetida no estado final. Limites de cobertura nativa permanecem explicitados.

**Handoff:** após o gate aprovado, registrar checkpoint, hashes/evidências, comandos finais, limites reais e “etapa 1 concluída” em `state.md`. Remover instruções temporárias vencidas. Não marcar conclusão por ter escrito o resumo.

O próximo trabalho é definir com o usuário o escopo e os módulos da etapa 2, com outro ciclo de contratos e gates. Nenhuma extração adicional é autorizada pelo encerramento desta pasta.
