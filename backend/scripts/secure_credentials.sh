#!/usr/bin/env bash
# Script para aplicar permissões seguras ao arquivo de credenciais locais
set -euo pipefail

CRED=credentials.json

if [ ! -f "$CRED" ]; then
  echo "Arquivo $CRED não encontrado. Coloque sua chave JSON na raiz do projeto." >&2
  exit 2
fi

chmod 600 "$CRED"
ls -l "$CRED"
echo "Permissões definidas para 600. NÃO comite este arquivo. Adicione 'credentials.json' ao .gitignore se necessário." 
