# ADR 005 — Comparar o payload do AppImage após transformações do empacotador

**Data:** 19/11/2026. **Estado:** aceita; detalha a prova de empacotamento prevista em P5.

O AppImage foi produzido, mas o primeiro verificador exigia igualdade do hash do ELF inteiro. Essa suposição era incorreta: o empacotador insere RPATH e o Tauri troca um marcador de bundle. A fonte instalada de `tauri-utils` e o [código oficial do empacotador](https://github.com/tauri-apps/tauri/blob/dev/crates/tauri-bundler/src/bundle.rs) confirmam `__TAURI_BUNDLE_TYPE_VAR_UNK` → `__TAURI_BUNDLE_TYPE_VAR_APP`.

A inspeção observou `.text` e Build ID idênticos; em `.rodata` havia somente os três bytes diferentes desse marcador, com tamanho inalterado. O RPATH passou a `$ORIGIN/../lib`.

Validar os hashes das seções `.text` e `.note.gnu.build-id` sem normalização. Para `.rodata`, exigir que o compilado contenha exatamente um marcador original e comparar todos os bytes após substituir somente esse marcador pelo de AppImage. Exigir RPATH esperado, identidade, entrada desktop, bundle novo e todos os nomes de assets imutáveis atuais. Registrar hashes completos e das seções. Qualquer outra diferença reprova.

Usar `objcopy`/`patchelf` já presentes para extrair seções/metadados. Nenhuma biblioteca ou alteração de produto é introduzida. O teste anterior falhou corretamente diante da suposição incompleta; a fase continua pendente até a prova corrigida e o gate integral passarem.
