#!/bin/bash
set -euo pipefail

# Mirrored in tooling/checks/contracts/provision.json; checked before adoption.
mise_version='2026.11.11'
mise_sha256='be6f46a4cc3d5532acf359f163cf7ce80ceb43e5718d7b9049165a340fb02e2d'
mise_url="https://github.com/jdx/mise/releases/download/v${mise_version}/mise-v${mise_version}-linux-x64"

if [ "$(uname -s)" != Linux ] || [ "$(uname -m)" != x86_64 ]; then
  printf 'O ambiente contratado requer Linux x86_64.\n' >&2
  exit 1
fi

verify_mise() {
  if ! printf '%s  %s\n' "$mise_sha256" "$mise_destination" | sha256sum --check --status; then
    printf 'Integridade/checksum do mise %s divergente: %s\n' "$mise_version" "$mise_destination" >&2
    exit 1
  fi
  local mise_output
  mise_output="$("$mise_destination" --version)"
  if [ "${mise_output%% *}" != "$mise_version" ]; then
    printf 'Versão do mise divergente; instale %s no ambiente pessoal.\n' "$mise_version" >&2
    exit 1
  fi
  printf '%s\n' "$mise_output" >&2
}

# Local development owns its mise installation. Never download or replace it.
if [ "$#" -eq 0 ]; then
  if ! mise_destination="$(command -v mise)"; then
    printf 'mise %s ausente do PATH; instale e configure o mise no seu usuário.\n' "$mise_version" >&2
    exit 1
  fi
  verify_mise
  printf '%s\n' "$mise_destination"
  exit 0
fi

# Only CI and clean provisioning proofs request an explicit temporary directory.
if [ "$#" -ne 2 ] || [ "$1" != '--install-dir' ] || [[ "$2" != /* ]]; then
  printf 'Uso: bash tooling/setup/install-mise.sh [--install-dir <diretório absoluto>]\n' >&2
  exit 2
fi
mise_bin_dir="$2"
mise_destination="$mise_bin_dir/mise"
if [ -L "$mise_destination" ]; then
  printf 'Destino simbólico recusado: %s\n' "$mise_destination" >&2
  exit 1
fi
if [ -f "$mise_destination" ]; then
  verify_mise
  printf '%s\n' "$mise_destination"
  exit 0
fi
mkdir -p "$mise_bin_dir"
mise_temporary="$(mktemp -d "$mise_bin_dir/.download-XXXXXXXX")"
trap 'rm -rf -- "$mise_temporary"' EXIT
curl --fail --location --silent --show-error --proto '=https' --proto-redir '=https' \
  --connect-timeout 20 --max-time 180 --output "$mise_temporary/mise" "$mise_url"
printf '%s  %s\n' "$mise_sha256" "$mise_temporary/mise" | sha256sum --check --status
chmod 755 "$mise_temporary/mise"
"$mise_temporary/mise" --version >&2
mv -- "$mise_temporary/mise" "$mise_destination"
printf '%s\n' "$mise_destination"
