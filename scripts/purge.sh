#!/bin/bash

# Script de Purga y Saneamiento (Tactical Reset) - Trazabilidad Logística
# Propósito: Borrón y cuenta nueva para evitar conflictos de nonces y metadatos.

echo "------------------------------------------------"
echo "  PURGANDO AMBIENTE (Reset Táctico)             "
echo "------------------------------------------------"

# 1. Eliminar persistencia de Anvil
if [ -f blockchain_state.json ]; then
    rm blockchain_state.json
    echo "✅ Persistent state (blockchain_state.json) eliminado."
fi

# 2. Eliminar directorios de Foundry/Forge
dirs_to_purge=("broadcast" "cache" "out")

for dir in "${dirs_to_purge[@]}"; do
    if [ -d "$dir" ]; then
        rm -rf "$dir"
        echo "✅ Directorio '$dir' purgado."
    fi
done

# 3. Limpiar artefactos del frontend
if [ -d frontend/src/contracts ]; then
    rm -f frontend/src/contracts/*.json
    echo "✅ Artefactos del frontend limpiados."
fi

echo "------------------------------------------------"
echo "  LIMPIEZA COMPLETADA. LISTO PARA RE-BOOTSTRAP  "
echo "------------------------------------------------"
