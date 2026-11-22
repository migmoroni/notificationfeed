# P5 — Integração e empacotamento do desktop

**Entrada:** P4 aprovado; desktop já localizado em `apps/desktop` desde P2.

**Contexto necessário:** C05 de [contratos](../contratos.md), manifests/scripts, `tauri.conf.json`, `Cargo.toml`, `Cargo.lock`, capacidades, build script e paths de recursos. Não refatorar os comandos Rust existentes.

## 1. Especificação

Comprovar que o Tauri compila e empacota o mesmo frontend web a partir da estrutura nova. Preservar identidade, recursos, permissões, crates e comportamento de seleção da plataforma.

Não adicionar Rust, C++, bindings, SQLite, Cargo workspace ou novos alvos nativos.

## 2. Contrato/Schema

Fixar paths relativos do frontend, diretório dos hooks e nomes dos artefatos esperados. Comparar identificador, versão, capabilities, ícones, features e dependências com P0. O artefato deve conter os recursos do build web aprovado; a inspeção precisa verificar conteúdo e referências, não só a existência de um arquivo `.AppImage`.

Inventariar compilador, bibliotecas de sistema e ferramentas de empacotamento necessárias no ambiente de execução. Ausência de pré-requisito é bloqueio do gate; instalar nova biblioteca exige decisão, conforme o protocolo.

```sh
npm run check:contracts -- --spec P5
```

## 3. Teste

Preparar verificações que rejeitem frontend ausente/incorreto, hook executado no diretório errado, referência a `../build` antigo e alteração da identidade. Definir a inspeção automatizada do bundle e sua relação com os assets do build produzido pelo hook.

Preservar os testes Rust que existirem e registrar sua quantidade real. Não criar testes que apenas repitam constantes ou apresentem compilação como prova da interface nativa.

## 4. Implementação mínima

Implementar os checks do bundle e corrigir somente paths/scripts necessários à integração. Usar os comandos existentes delegados ao workspace desktop e o manifesto Rust movido.

Uma alteração de código Rust ou de recursos além da adaptação estrutural precisa de justificativa dentro do contrato; mudança de comportamento ou nova dependência aciona o fusível.

## 5. Quality Gate

```sh
npm run gate:migration -- P5
```

O runner executa, além de contratos, arquitetura e testes do árbitro:

```sh
npm run build
cargo check --locked --manifest-path apps/desktop/src-tauri/Cargo.toml
cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml
npm run tauri:appimage
```

**Aceite:** todos retornam zero e a inspeção do artefato é aprovada. O frontend empacotado corresponde ao build da web, identidade/permissões permanecem iguais e nenhum lockfile Rust foi atualizado incidentalmente.

**Auditoria:** conferir logs reais de compilação/empacotamento e conteúdo do bundle. A prova cobre compilação, testes disponíveis, paths e empacotamento; não equivale a E2E da WebView, notificações ou integração com o sistema. Ferramenta ausente não pode ser tratada como sucesso parcial.

**Handoff:** registrar ambiente, artefato/hash, testes executados e limites de cobertura. P6 só começa após o gate completo aprovado.
