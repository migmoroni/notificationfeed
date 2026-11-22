# ADR 008 — Família desktop e Rust

**Data:** 20/11/2026. **Estado:** Tauri e rust-toolchain aprovados em gates completos.

Atualizar a família existente de JS, CLI e crates Tauri v2 em uma unidade. Os alvos são os de updates.json; não acrescentar plugins nativos process/updater, ativar SQLite, alterar permissões ou incluir plataforma. As dependências diretas e features do crate permanecem iguais, comprovadas por native-project.json e pelo metadata oficial do Cargo. Provas adversas rejeitam alterações de identidade, backend padrão, optionalness, plugins e flags declaradas.

Os metadados npm e o índice oficial Cargo foram preservados na entrada do grupo. A consulta direta à API crates.io teve timeout/403; o índice local contém versões/checksums/MSRV, e o próprio Cargo resolveu/obteve as versões pela distribuição oficial. A família selecionada declara MSRV 1.90. A compilação real locked passou com Rust 1.95.0, sem alterações no Cargo.toml ou nas fontes nativas.

O delta JS contém somente @tauri-apps. O delta Cargo inclui os parsers/build de assets, serde, WebView, janelas/menu/tray, notificações/IPC e bindings das plataformas já representadas pelo lock. Cada nó alterado possui um caminho verificável a partir de uma raiz selecionada; checksums de versões mantidas foram comparados. Registro completo: desktop-tauri-delta.json. Metadados opcionais não habilitam alvo de compilação ou feature do aplicativo.

Preservar os 207 testes e executar gate completo com novo AppImage, payload/assets correspondentes e cenários web/PWA. Cargo test sem casos de comportamento não comprova UI nativa ou entrega real de notificações.

Na unidade posterior rust-toolchain, fixar Rust 1.100.0 com rustfmt/Clippy e cargo-audit 0.23.0 conforme seleção. Registrar rust-version = 1.95 como mínimo conservador já testado do crate/lock Linux atual, sem alegar validação do projeto em 1.90 apenas com base no MSRV upstream. O toolchain de referência é exato; não alterar o default global do usuário.

Fontes: [atualização Tauri](https://v2.tauri.app/develop/updating-dependencies/), [release selecionada](https://github.com/tauri-apps/tauri/releases/tag/tauri-v2.12.7), [Rust selecionado](https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/). Metadados e grafos em .artifacts/maintenance/2.4/desktop-tauri/input.

A primeira auditoria/gate desktop recusou RUSTSEC-2026-0195: Tauri-utils passou a compilar plist 1.9.0/quick-xml 0.39.2 no Linux. A classificação histórica por ausência de compilação deixou de valer e não foi dispensada. O índice oficial confirma plist ^1 → 1.10.4 (MSRV 1.88) → quick-xml ^0.42.0 (MSRV 1.86), linha corrigida conforme RustSec >=0.41.0. Registrar os dois alvos no grupo antes da edição, comprovar recusa das versões antigas e atualizar plist pela faixa compatível. Cargo selecionou quick-xml 0.42.0. Delta recalculado com caminhos; repetir auditoria/compilação/gate completos. Decisão histórica permanece como entrada, sem nova exceção.

Rust 1.100.0, rustfmt/Clippy e cargo-audit 0.23.0 foram instalados pelos mecanismos oficiais. O auditor usa diretório isolado em .artifacts/toolchains; o default global rustup foi comparado antes/depois e permaneceu stable existente. rust-toolchain.toml seleciona o compilador nominal; Cargo.toml declara mínimo 1.95. Teste adverso do MSRV e contrato real passaram após a recusa esperada do mínimo ausente. Ambos os locks permaneceram byte a byte iguais; versões/componentes/hash do auditor constam em rust-toolchain-adoption.json. Auditoria com 0.23.0 passou sem ignorar advisories. O gate completo ainda deve provar os consumidores com o novo compilador; a mudança de never-type fallback documentada no Rust 1.100 não recebe supressão preventiva.

Gate rust-toolchain aprovado em .artifacts/maintenance/2.4/rust-toolchain/2026-11-20T22-50-23.745Z-34918314-ac5f-438c-a785-8390386837b3/evidence.json: 48 provas Node, tipos/207 testes/segurança, Cargo check/test, release/AppImage e Chromium dev/produção/atualização 1/3/3 sem skip/flaky. Nenhuma adaptação das fontes Rust ou mudança de edition foi necessária com 1.100.0. Aprovação da fase 2.4 depende ainda do gate final integrado.
