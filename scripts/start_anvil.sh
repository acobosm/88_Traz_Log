#!/bin/bash
# Script para arrancar Anvil con persistencia y 20 cuentas
# IP Local configurada: 192.168.100.9

# Script para arrancar Anvil con persistencia y 20 cuentas
# IP Local se extrae de: src/config/config.js

# Extraer variables desde config.js usando Node.js
ACCOUNTS=$(node -e 'console.log(require("./src/config/config.js").ANVIL_ACCOUNTS)')
STATE=$(node -e 'console.log(require("./src/config/config.js").STATE_FILE)')
BIND_IP=$(node -e 'console.log(require("./src/config/config.js").BIND_IP)')
LOCAL_IP=$(node -e 'console.log(require("./src/config/config.js").LOCAL_IP)')

echo "Configuración detectada en config.js:"
echo " - Cuentas: $ACCOUNTS"
echo " - Archivo de Estado: $STATE"
echo " - IP Escucha (Bind): $BIND_IP"
echo " - IP Conexión (Public): $LOCAL_IP"

echo "Arrancando Anvil con autoguardado de estado cada 30 segundos..."
anvil --accounts "$ACCOUNTS" --state "$STATE" --state-interval 30 --host "$BIND_IP"


