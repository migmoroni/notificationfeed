# Alvos de build

O repositório mantém web/PWA e Tauri Linux x86_64 AppImage, consumindo o mesmo produto em packages/notfeed. A rotina de instalação e validação está em [development.md](development.md).

| Alvo           | Comando               | Saída                                                                              | Persistência            | Service worker            |
| -------------- | --------------------- | ---------------------------------------------------------------------------------- | ----------------------- | ------------------------- |
| Web dev        | `pnpm dev`            | localhost:5173, porta estrita                                                      | IndexedDB               | Ausente em dev            |
| Web build      | `pnpm build`          | apps/web/build, adapter-static                                                     | IndexedDB               | Emitido no build          |
| Preview PWA    | `pnpm pwa:preview`    | 127.0.0.1:4173, porta estrita                                                      | IndexedDB               | Ativo no preview          |
| Tauri AppImage | `pnpm tauri:appimage` | apps/desktop/src-tauri/target/release/bundle/appimage/Notfeed_0.1.0_amd64.AppImage | IndexedDB do WebKit2GTK | Não registrado no desktop |

## Web/PWA

Node 24.22.3 e pnpm 11.28.12 são selecionados pelo mise 2026.11.11 e seu lock. Após o bootstrap descrito em development.md, use `mise run setup:web`. `mise exec -- pnpm run doctor --target web` diagnostica o ambiente sem instalar ferramentas e sem exigir Rust/GTK. As versões são comuns ao desenvolvimento Debian 13 e à CI Ubuntu 24.04, ambos x86_64.

## Tauri Linux x86_64

Com rustup e os pacotes de sistema disponíveis, prepare o toolchain fixado e o auditor em prefixo próprio:

```sh
mise run setup:desktop
```

rust-toolchain.toml seleciona Rust 1.100.0; o mínimo declarado da crate é 1.95, já validado no Linux com o lock adotado. O default global do rustup não precisa mudar. Confira overrides com `pnpm run doctor --target desktop`.

Em Debian 13 e Ubuntu 24.04, os requisitos de compilação/inspeção são os mesmos nomes de pacotes. A instalação local é explícita:

```sh
sudo apt install build-essential pkg-config libwebkit2gtk-4.1-dev libgtk-3-dev \
  librsvg2-dev libayatana-appindicator3-dev libssl-dev patchelf binutils
```

A execução de AppImage pelo usuário pode exigir o suporte FUSE da distribuição. A inspeção automatizada extrai o bundle e não abre janela nativa.

O desktop é validado no Debian 13 local. A CI mínima atual valida somente web no Ubuntu 24.04, sem comprovar o pacote desktop nessa distribuição. Um AppImage construído no Debian 13 não garante compatibilidade com versões mais antigas da glibc. Docker e outros sistemas não fazem parte do ambiente adotado nesta etapa.

A CLI Tauri executa em apps/desktop. Seus hooks usam pnpm na raiz, constroem apps/web e consomem frontendDist ../../web/build a partir de src-tauri. `CARGO_TARGET_DIR`, quando definido, muda o diretório de saída e é respeitado pela inspeção.

A crate notfeed 0.1.0 mantém edition 2021, lib notfeed_lib e feature padrão backend-indexeddb. backend-sqlite continua declarado como opção futura e não é ativado pelos comandos ou gates desta etapa. Identidade app.notfeed.desktop e permissões http/shell/notification permanecem iguais.

`pnpm verify:integration` executa Cargo check/test, rustfmt, Clippy, segurança, build AppImage e inspeção ELF/assets atuais antes dos testes Chromium dev/produção/atualização. A prova nativa cobre compilação, um teste Rust de regressão de segurança de origens URL e o pacote. Não há E2E de WebView/notificações.

## Alvos futuros

Windows, macOS, Android, outros bundles Linux, armazenamento SQLite e integrações Rust/C++ adicionais dependem de etapas próprias. Não há novos comandos ou garantias de suporte para esses alvos nesta entrega. A organização dos módulos de negócio pertence à etapa 3.
