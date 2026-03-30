#!/bin/bash

# Script de Inicialización Táctica (Bootstrap) - Trazabilidad Logística
# Automatiza: Despliegue -> Captura de Dirección -> Configuración -> Semillas

# 1. Cargar variables de entorno
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "❌ Falta archivo .env. Por favor, créalo basándote en .env.example o similar."
    exit 1
fi

# --- NUEVA VARIABLE TÉCNICA PARA TENDERLY ---
CHAIN_ID=${CHAIN_ID:-31337}

echo "------------------------------------------------"
echo "  INICIANDO BOOTSTRAP TÁCTICO (Red: $CHAIN_ID) "
echo "------------------------------------------------"

# 2. Desplegar Contrato
echo "🚀 Desplegando Contrato TrazabilidadLogistica..."
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --force
if [ $? != 0 ]; then
    echo "❌ Error en el despliegue."
    exit 1
fi

# 3. Capturar nueva dirección desde el broadcast
# Usamos jq para extraer la dirección del contrato creado en run-latest.json
#JSON_FILE="broadcast/Deploy.s.sol/31337/run-latest.json"
JSON_FILE="broadcast/Deploy.s.sol/${CHAIN_ID}/run-latest.json"
if [ ! -f "$JSON_FILE" ]; then
    echo "❌ No se encontró el reporte de despliegue en $JSON_FILE"
    exit 1
fi

NEW_ADDRESS=$(jq -r '.transactions[] | select(.transactionType=="CREATE") | .contractAddress' "$JSON_FILE")

if [ -z "$NEW_ADDRESS" ] || [ "$NEW_ADDRESS" == "null" ]; then
    echo "❌ No se pudo capturar la dirección del contrato desde el JSON."
    exit 1
fi

echo "✅ Nuevo Contrato detectado en: $NEW_ADDRESS"

# 4. Actualizar .env
# Actualizamos ambas variables: la interna y la de Vite
sed -i "s/^CONTRACT_ADDRESS=.*/CONTRACT_ADDRESS=$NEW_ADDRESS/" .env
sed -i "s/^VITE_CONTRACT_ADDRESS=.*/VITE_CONTRACT_ADDRESS=$NEW_ADDRESS/" .env

# EXPORTAR para que el proceso actual y scripts subsiguientes (como Seed.s.sol) vean el cambio
export CONTRACT_ADDRESS=$NEW_ADDRESS
export VITE_CONTRACT_ADDRESS=$NEW_ADDRESS

echo "✅ .env actualizado y variables exportadas."

# 5. Sincronizar ABI
mkdir -p frontend/src/contracts
cp out/TrazabilidadLogistica.sol/TrazabilidadLogistica.json frontend/src/contracts/TrazabilidadLogistica.json
echo "✅ ABI sincronizado en el frontend."

# 7. Ejecutar Semillas (Roles y Personal)
echo "🌱 Sembrando Identidades Tácticas (Alice, Bob, etc.)..."
forge script script/Seed.s.sol --rpc-url $RPC_URL --broadcast --force
if [ $? != 0 ]; then
    echo "❌ Error al ejecutar el script de semillas."
    exit 1
fi

echo "------------------------------------------------"
echo "  ENTORNO SINCRONIZADO Y LISTO PARA OPERAR      "
echo "  Contrato: $NEW_ADDRESS"
echo "------------------------------------------------"
echo ""
echo "Consola de comandos lista. Escriba 'clear' para limpiar."
