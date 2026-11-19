# Protocolo de execução e handoff

## Contexto cirúrgico

Ao iniciar uma sessão, ler `state.md`, invariantes e a ficha da fase ativa. Carregar apenas os contratos, ADRs e arquivos explicitamente envolvidos nessa fase. Consultar a proposta ou outras áreas somente para resolver uma questão concreta. Não reler todo o repositório nem iniciar limpeza fora do recorte.

Verificar `git status` antes de editar. Alterações não reconhecidas pertencem ao usuário até confirmação. Não usar `reset --hard`, limpeza ampla, exclusão de dados reais ou recuperação que apague trabalho alheio.

## Ciclo obrigatório

1. **Especificação:** explicitar a mudança, entradas, saídas e não objetivos da fase.
2. **Contrato:** validar `check:contracts -- --spec <fase>` e os valores protegidos. Em P0, usar os testes de contrato de bootstrap antes de implementar o árbitro.
3. **Teste:** criar ou adaptar a prova independente do resultado esperado. Para mudanças novas, demonstrar que a prova detecta o estado incorreto. A evidência de falha esperada é separada do gate final.
4. **Implementação mínima:** realizar apenas o necessário para satisfazer o contrato. Não começar a fase seguinte.
5. **Quality Gate:** executar o árbitro e realizar a revisão adversa. Corrigir apenas a causa raiz e repetir os checks afetados.

Cada fase exige que o predecessor esteja aprovado. Alteração de contrato após começar a implementação retorna ao passo de contrato e teste; não pode servir para acomodar silenciosamente uma implementação incorreta.

## Builder e Auditor

São duas posturas explícitas de execução e revisão; não exigem agentes adicionais.

O **Builder** prepara o contrato/teste e a mudança mínima. Ao concluir, descreve o diff e informa quais verificações espera satisfazer, sem marcar a fase como pronta.

O **Auditor** lê o diff com os invariantes em mãos, procura caminhos de compatibilidade, arquivos duplicados, imports indevidos, tipos relaxados, testes removidos e mudanças de dados. Confere se os comandos executam as fontes movidas e se o runtime relevante foi realmente testado. Executa o gate independentemente da afirmação do Builder.

Qualquer erro devolve o recorte ao Builder com a causa identificada. Não silenciar erro, alterar um snapshot sem justificativa, reduzir uma assertion ou mudar o contrato apenas para obter zero.

## Fusível cognitivo

Parar imediatamente o recorte afetado e perguntar ao usuário quando houver:

- Ambiguidade sobre destino do código, limite entre pacote e aplicativo ou contrato de comportamento.
- Conflito entre invariantes, escopo e requisito recebido.
- Necessidade de biblioteca não declarada ou além do Playwright já autorizado.
- Necessidade de mudar regras, schema, identidade de armazenamento ou suporte de plataforma para passar no gate.
- Falha preexistente cuja correção ultrapasse configuração de teste ou adaptação estrutural delimitada.

Registrar em `state.md`: fase, evidência, invariante/contrato envolvido, alternativas e pergunta pendente. Fazer uma pergunta objetiva com o impacto de cada alternativa. Enquanto a decisão estiver pendente, não implementar a solução dependente nem avançar para outra fase.

## Protocolo de recusa

Se uma instrução pedir violação de uma regra, recusar aquela alteração enquanto o conflito persistir. Citar o ID e oferecer uma alternativa. Exemplo: manter `$lib` remapeado para a árvore antiga viola INV-02; atualizar os consumidores diretamente atende o contrato.

Se o usuário decidir mudar o requisito, registrar a decisão, revisar contrato e ADR e validar a nova regra antes de escrever a implementação. Uma ADR unilateral não autoriza romper um invariante.

## Memória viva e recuperação

Após um gate aprovado, atualizar `state.md` com resultado compacto, localização das evidências, checkpoint e próxima fase. Remover instruções temporárias que perderam validade. Manter o histórico resumido nas evidências/ADRs, sem acumular transcrições no estado.

Um checkpoint deve identificar exatamente o código auditado. Quando houver commit, incluir apenas os arquivos da fase. Se não houver commit disponível, registrar referência de origem e hashes/diff suficiente para reproduzir o estado; não inventar SHA nem descartar alterações do usuário.

No encerramento de uma sessão incompleta, informar o último passo concluído do ciclo, arquivos alterados, testes executados e a próxima ação exata. Uma sessão encerrada não equivale a fase aprovada.

O último gate desta pasta conclui somente a etapa 1. A definição dos módulos da etapa 2 requer seu próprio contrato com o usuário.

