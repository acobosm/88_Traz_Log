#!/bin/bash

# Script de Monitoreo Táctico - Trazabilidad Logística
# Gestiona el Frontend, Logs y Consolas en una sola sesión de tmux para el flujo de trabajo con Tenderly

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

  # Pausa para asegurar que todas las terminales estén listas
  sleep 1

  # Panel 0 (Superior Izquierda): Consola Principal
  # Aquí puedes ejecutar manualmente ./scripts/bootstrap.sh cuando sea necesario
  tmux send-keys -t "$SESSION:0.0" "echo 'Consola Principal. Ejecuta ./scripts/bootstrap.sh para desplegar en Tenderly.'" C-m
  tmux send-keys -t "$SESSION:0.0" "clear" C-m

  # Panel 1 (Superior Derecha): Frontend (Vite)
  tmux send-keys -t "$SESSION:0.1" "echo 'Iniciando Frontend...'; cd frontend && npm run dev" C-m
  
  # Panel 2 (Inferior Izquierda): Logs Operativos (LECTURA)
  tmux send-keys -t "$SESSION:0.2" "touch logs/operaciones.log && tail -f logs/operaciones.log" C-m

  # Panel 3 (Inferior Derecha): Consola Secundaria
  tmux send-keys -t "$SESSION:0.3" "echo 'Consola secundaria para comandos (git, etc.)'" C-m
  tmux send-keys -t "$SESSION:0.3" "clear" C-m

  # Ajustar a layout cuadriculado
  tmux select-layout -t "$SESSION" tiled
fi

# Adjuntar a la sesión
tmux attach-session -t "$SESSION"
