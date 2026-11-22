# ADR 004 — Unidades de atualização e cache nativo

**Data:** 20/11/2026. **Estado:** aceita para execução de 2.2; gates da fase pendentes.

As unidades network-js e rust-network foram fixadas em 2.1. O gate de cada unidade exige suas versões exatas e as dos grupos anteriores. A coleta online continua completa; somente riscos classificados de grupos futuros podem aguardar sua unidade. O fechamento 2.2 não aceita nenhum urgente pendente; 2.4 e posteriores não aceitam risco aplicável pendente. Advisory desconhecido, condição não provada ou relatório inválido continuam bloqueantes.

Cada unidade percorre contrato/teste antes da atualização. Testes adversos provaram versão antiga, unidade desconhecida, risco do próprio grupo e fechamento incompleto. Não se pode usar o recorte de unidade para aprovar a fase inteira.

Instalações JS permanecem em candidatos novos com cache vazio. O target Cargo usa `.artifacts/maintenance/native-cache` compartilhado entre candidatos para limitar consumo de disco e repetição de compilação. Cargo continua executado com lock, sobre as fontes atuais; Tauri gera novo AppImage. A inspeção resolve os caminhos pelo mesmo CARGO_TARGET_DIR e exige data atual, executável/sections/identidade/assets correspondentes ao build atual. Teste rejeita artefato fora do target. Cache não é recibo nem substitui execução.

O primeiro cache foi copiado, sem hardlinks, do target gerado pelo gate 2.1 aprovado. Fontes, permissões e locks não foram copiados sobre o produto ou alterados para essa reutilização. A inspeção e o gate completo de network-js validarão a adoção.
