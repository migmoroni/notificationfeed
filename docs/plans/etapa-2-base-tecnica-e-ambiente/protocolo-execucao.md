# Protocolo de execução e handoff da etapa 2

## Contexto cirúrgico

Em cada turno, ler `state.md`, invariantes, ficha da fase e contrato da unidade ativa. Carregar apenas arquivos/ADRs necessários ao recorte. Consultar a proposta e a etapa 1 para resolver uma questão específica, sem reler toda a aplicação.

Verificar `git status` antes de escrever. Preservar alterações não reconhecidas. Não usar limpeza ampla, `reset --hard`, troca forçada de HEAD/índice ou remoção de dados para preparar um gate. Instalações limpas, testes negativos e reconstruções usam áreas sintéticas isoladas; não apagar o ambiente cotidiano para simular um clone.

## Ciclo obrigatório por unidade

1. **Especificação:** registrar resultado, arquivos, não objetivos e perfil de impacto. Selecionar versões exatas antes de qualquer atualização.
2. **Contrato/Schema:** preencher os registros necessários e executar a validação. Em 2.1a, os testes diretos do manifesto fazem o bootstrap. Não escrever lógica funcional enquanto contrato/interface/expectativas não estiverem validados.
3. **Teste:** preparar a prova independente e demonstrar que detecta o estado incorreto quando houver comportamento novo. Distinguir essa falha esperada do gate final. Reutilizar testes de produto existentes que já protejam o comportamento.
4. **Implementação Mínima:** alterar apenas o recorte. Não antecipar o grupo seguinte nem inserir refatoração de negócio em uma atualização técnica.
5. **Quality Gate:** revisar como Auditor, executar os comandos obrigatórios e registrar recibos reais. Erro retorna ao Builder para corrigir a causa raiz; o contrato não é relaxado para aceitar o resultado.

Se um contrato precisar mudar, explicar a razão e voltar ao passo 2, com teste atualizado **antes** da implementação correspondente. Uma descoberta técnica não autoriza violar um invariante. Não exigir uma nova aprovação do usuário para cada tarefa que já esteja coberta pelo plano autorizado.

## Builder e Auditor

Builder e Auditor são posturas distintas, sem obrigação de criar agentes adicionais. O Builder prepara o diff e descreve seu efeito; não marca a fase aprovada. O Auditor procura argumentos contrários: dependências ocultas pelo cache, perda de testes, tipos escapando por casts, alterações de regra misturadas com atualização, referências históricas regravadas e comandos que não testam o alvo anunciado.

Conferir o diff completo da unidade, incluindo locks e arquivos não rastreados. Executar o árbitro sobre a revisão examinada e conferir códigos de retorno, perfil, identidades dos testes e limites de cobertura. Alterar fonte, configuração, contrato ou lock após a prova invalida os resultados afetados.

## Fusível cognitivo

Parar imediatamente o recorte dependente e perguntar ao usuário diante de:

- Ambiguidade estrutural, conflito entre contratos ou necessidade de mover responsabilidades de negócio.
- Biblioteca direta/ferramenta nova além das autorizadas em C02, driver nativo ou integração não prevista.
- Atualização que exija mudança de schema, perda/conversão de dados, nova plataforma ou redesenho amplo.
- Regra de lint cujo atendimento ultrapasse a adaptação técnica delimitada, ou risco aplicável que só possa ser tratado fora do escopo.
- Falta de acesso/recurso necessário para uma prova real, sem alternativa equivalente dentro do contrato.

Registrar fase/unidade, evidência, regra envolvida, opções e pergunta no estado. Não implementar a escolha dependente nem avançar para outra fase enquanto faltar a decisão. Pode continuar análise/documentação independente. Autorizações anteriores persistem: Playwright e as ferramentas de C02 não precisam ser perguntadas novamente.

Mise foi incluído no plano a pedido do usuário em 21/11/2026. Debian 13 local e Ubuntu 24.04 na CI já estão decididos. Na execução da unidade, selecionar versão/backend e integridade dentro de C11 sem pedir novamente autorização para o próprio mise; dependência adicional não prevista continua sujeita ao fusível. O pedido atual de atualizar o plano não instala ferramentas.

## Recusa de violação

Recusar a alteração conflitante enquanto o conflito persistir, citar o ID e oferecer uma alternativa. Exemplo: `--shamefully-hoist` para ocultar um import não declarado viola E2-INV-06; declarar a dependência no consumidor e testar a instalação limpa é a alternativa.

Uma decisão explícita do usuário pode revisar o requisito. Registrar ADR, atualizar contrato e testes antes da implementação; o executor não cria sozinho uma exceção para se aprovar.

## Memória e checkpoints

Após cada unidade, atualizar `state.md` de forma compacta: fase/unidade, passo concluído, resultado, revisão/hash, caminho de evidência, decisões e próxima ação exata. No encerramento de fase, remover instruções temporárias e deixar o histórico detalhado nos recibos/ADRs. Não apagar evidências que expliquem uma decisão.

Checkpoint deve representar exatamente o estado auditado. Usar commit quando disponível ou snapshot/diff reproduzível com hashes; preservar HEAD/índice e alterações do usuário. Registrar como restaurar em área isolada. Não restaurar sobre trabalho atual sem avaliar os deltas.

Ao encerrar sessão incompleta, registrar checks realmente executados e pendentes, sem equiparar código escrito ou documentação atualizada a gate aprovado. `executionStarted` já é verdadeiro desde 2.1; manter essa história. Uma ampliação planejada fica em `plannedExtensions` até a adoção com contrato/testes e não pode aparecer como unidade implementada ou aprovada.

Para o acréscimo mise, começar pela ficha 2.5f, C11 e ADRs 016/017. Validar dados de seleção antes do bootstrap; implementar as provas antes de adaptar o executor. Distinguir recibos históricos da nova obrigação PROVISION, manter hashes antigos e registrar novo fechamento 2.5 e nova configuração 2.6. A instalação limpa usa diretórios próprios por ferramenta, sem alterar HOME, configurações ou defaults pessoais.

## CI e encerramento

Preparar workflow e validações locais antes de solicitar qualquer acesso/publicação ainda necessário. Uma solicitação para planejar não publica branch, abre PR ou altera configurações remotas. Na execução, aproveitar autorização existente; se faltar autorização/acesso para disponibilizar o commit à CI, apresentar o resultado concreto e a ação necessária. A pendência fica em 2.6b, sem alegar que testes locais substituem a CI real.

Depois de 2.7, entregar base técnica estabilizada, recibos, limitações e ponto de partida para a etapa 3. Não iniciar definição/extração de módulos nem alterações de regras de negócio como continuação automática.
