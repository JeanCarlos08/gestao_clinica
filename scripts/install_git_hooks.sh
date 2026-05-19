#!/usr/bin/env bash
# Instala hooks locais do diretório .githooks para .git/hooks
set -euo pipefail

if [ ! -d .git ]; then
  echo "Este repositório não parece ser um repositório git (pasta .git ausente)" >&2
  exit 2
fi

mkdir -p .git/hooks
cp -v .githooks/* .git/hooks/
chmod +x .git/hooks/*

echo "Git hooks instalados. Agora o pre-commit evitará commits de credentials.json" 
