# ADR 019 — Consolidação com recuperação e CI das fontes finais

Data: 22/11/2026. Decisão adotada na execução de 2.7; aprovação depende de seu gate.

2.6/execution e 2.6/final aprovaram 29 checks nas fontes de 4f1736f, com CI real 45043321853/1. O plano ainda exigia adotar o executor de 2.7 e demonstrar uma reconstrução externa; o verde de 2.6 não encerrava a etapa.

consolidation.json fixa 30 checks. 2.7 mantém todos os checks de 2.6 e acrescenta CHECKPOINT. CI-REMOTE vem primeiro para recusar revisão incompatível antes das operações caras. Continuam obrigatórios provisionamento, segurança atualizada, desktop e navegador locais; bundle inspecionado precede PWA.

O checkpoint usa Git, tar e as rotinas de provisionamento já disponíveis, sem biblioteca nova. Guarda HEAD em bundle, fontes em arquivo e hashes, locks e estado separados. Um clone sem checkout é restaurado em diretório temporário externo; a instalação limpa recebe exclusivamente as fontes recuperadas. A prova compara arquivos, revisão, locks e índice original, preserva logs e descarta instalações temporárias. Não modifica HEAD/índice do usuário nem introduz recuperação sobre o checkout atual.

A consolidação corrige documentação ativa desatualizada sobre provisionamento e cobertura Rust. Existe um teste Rust de segurança de origens URL, além de Cargo e pacote; não há E2E nativo de WebView/notificações. Nenhum módulo de negócio ou plataforma é acrescentado.

As alterações de executor e documentação mudam o fingerprint: o run de 2.6 permanece uma prova histórica válida, mas não aprova as fontes finais de 2.7. Publicação continua pertencendo ao usuário. Preparar e verificar localmente o recorte antes de solicitar esse push; depois dele, somente o gate 2.7 aprovado e o estado vivo encerram a etapa, sem nova edição de fontes.
