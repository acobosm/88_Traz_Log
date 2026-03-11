#!/bin/bash

# Script de Monitoreo Táctico - Trazabilidad Logística (Versión Ultra-Estable)
# Gestiona Anvil, Frontend y Logs en una sola sesión de tmux

SESSION="TrazabilidadLogistica"

# Verificar si la sesión ya existe
tmux has-session -t "$SESSION" 2>/dev/null

if [ $? != 0 ]; then
  # 1. Crear nueva sesión (Ventana inicial)
  tmux new-session -d -s "$SESSION" -n "Dashboard"
  
  # Habilitar soporte para Ratón (Click y Scroll)
  tmux set -g mouse on
  
  # 2. Crear Layout 2x2 de forma determinista
  # Dividir pantalla principal en dos (Izquierda y Derecha)
  tmux split-window -h -t "$SESSION:0.0"
  
  # Dividir panel izquierdo (0) en dos (Arriba y Abajo)
  tmux split-window -v -t "$SESSION:0.0"
  
  # Dividir panel derecho (1) en dos (Arriba y Abajo)
  tmux split-window -v -t "$SESSION:0.1"

  # Pausa generosa para asegurar que todas las terminales estén listas
  sleep 3

  # 3. Asignar Comandos a Paneles Específicos
  
  # Panel 0 (Superior Izquierda): Anvil
  tmux send-keys -t "$SESSION:0.0" "./scripts/start_anvil.sh" C-m
  
  # Panel 1 (Superior Derecha): Consola de Comandos (LIBRE)
  tmux send-keys -t "$SESSION:0.1" C-m C-u "echo '------------------------------------------------'" C-m
  tmux send-keys -t "$SESSION:0.1" "echo '  CENTRO DE MANDO: CONSOLA DE COMANDOS LISTA    '" C-m
  tmux send-keys -t "$SESSION:0.1" "echo '------------------------------------------------'" C-m

  # Panel 2 (Inferior Izquierda): Frontend (Vite)
  tmux send-keys -t "$SESSION:0.2" "node scripts/logger.js 'Iniciando Frontend...' && cd frontend && npm run dev" C-m
  
  # Panel 3 (Inferior Derecha): Logs Operativos (LECTURA)
  tmux send-keys -t "$SESSION:0.3" "touch logs/operaciones.log && tail -f logs/operaciones.log" C-m

  # Ajustar a layout cuadriculado
  tmux select-layout -t "$SESSION" tiled
fi

# Adjuntar a la sesión
tmux attach-session -t "$SESSION"
