# Plan de Desarrollo: Trazabilidad Logística Global (Blockchain)

Este plan detalla el desarrollo fase por fase del sistema de trazabilidad para incendios forestales, cumpliendo con los requisitos de la maestría, incluyendo persistencia de datos en JSON, configuración de IP local y adaptación del panel táctico.

## User Review Required

> [!IMPORTANT]
> Se requiere que el usuario confirme la dirección IP local actual (`192.168.100.9`) y el deseo de usar 20 cuentas de Anvil. Al final de cada fase, el asistente se detendrá para que el usuario tome capturas y confirme el avance.

## Proposed Changes

### Fase 1: Configuración, Persistencia y Conectividad
- Crear la estructura de directorios del proyecto.
- Configurar script de arranque para Anvil con `--accounts 20` y persistencia de transacciones en `blockchain_state.json`.
- Implementar archivo de configuración para la IP Local variable (`192.168.100.9`).
- **Entregable**: Anvil persistente y **Subida a GitLab/GitHub**.

---

### Fase 2: Smart Contract - Inventario Basado en Casos Reales
- Revisar `Informe_IF_LLaviucu_Azuay-signed.pdf` y el informe del Cañón del Chiche para extraer insumos reales.
- Implementar el contrato `TrazabilidadLogistica.sol` (Roles, Registro de Personal e Insumos).
- **Entregable**: Contrato con inventario real cargado y **Subida a GitLab/GitHub**.

---

### Fase 3: Gestión de Incidentes - Pruebas e Integridad
- Configurar el entorno de pruebas con **Foundry**.
- Desarrollar `test/TrazabilidadLogistica.t.sol` para validar:
    - Control de acceso por roles (`BASE_OPERATIVA`, `JEFE_ESCENA`, etc.).
    - Ciclo de vida del incendio (Inicio, Asignación de recursos, Hitos).
    - **Auditoría Automática**: Validar que la alerta de consumo se dispare ante desviaciones del >20%.
- ### [MODIFY] [TrazabilidadLogistica.sol](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/contracts/TrazabilidadLogistica.sol)
- Implementar función `registrarInsumosBatch` con lógica de **Salto Silencioso (Idempotencia)**.
- El contrato validará si cada ID existe antes de registrarlo: si no existe lo registra, si existe lo ignora sin revertir la transacción completa.
- Optimizar consumo de gas mediante el uso de calldata y arreglos concurrentes.
- Ejecutar despliegue inicial en Anvil y cargar el inventario real (`seed_inventory.js`).
- **Entregable**: Lógica validada, capturas de tests exitosos y **Subida a GitLab/GitHub**.

---

### Fase 4: Interfaz Web3 y Monitoreo (tmux)
- Crear script `scripts/monitor.sh` para gestionar servicios en **tmux**:
    - Disposición dinámica: 2 servicios (Anvil/Vite) en split de 2; 3-4 servicios en split de 4.
    - Soporte para múltiples ventanas si exceden los 4 servicios (layout 2x2).
- Desarrollar UI base para carga de datos y coordenadas.
- Implementar botón de descarga de `plantilla_inventario.csv` para las bases operativas.
- **Entregable**: Consola de monitoreo operativa y UI funcional sincronizada con Anvil.

---

### Fase 5: Integración del Panel FireOps
- Integrar botón "Panel de Control" en la interfaz Web3 para abrir FireOps en las coordenadas del evento.
- Adaptar FireOps para leer hitos de la blockchain y permitir escritura de datos relevantes (pines, ubicación de brigadas).
- **Entregable**: Panel táctico sincronizado y **Subida a GitLab/GitHub**.

---

### Fase 6: Auditoría, Cierre y Reportes
- Implementar retorno de insumos, gestión de discrepancias y sellos de auditoría.
- Generar visualización para la rendición de cuentas post-evento.
- **Entregable**: Flujo completo de auditoría y **Subida a GitLab/GitHub**.

---

### Fase 7: Consolidación y Entrega Final
- Finalizar el documento de evidencias y el informe final.
- Revisión general contra la rúbrica de la maestría.
- **Entregable**: Proyecto concluido y **Subida final a GitLab/GitHub**.


## Verification Plan

### Automated Tests
- Scripts de prueba para cada función del Smart Contract (Hardhat/Foundry).
- Validación de que los datos persistidos en `blockchain_state.json` coincidan con el estado del contrato.

### Manual Verification
- Pruebas de conectividad desde otro dispositivo usando la IP local.
- Simulación completa de un incendio desde el panel de control.
- Capturas de pantalla manuales de las transacciones en la terminal y en la dApp.
