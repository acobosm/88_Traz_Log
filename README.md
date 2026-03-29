# FireOPS: Trazabilidad Logística en Incendios Forestales y Eventos de Quema Controlada 🚒🛡️🔗

Este proyecto es una Aplicación Descentralizada (dApp) basada en tecnología **Blockchain (EVM)** y diseñada para ser desplegada en redes de la familia **Ethereum** (como Mainnet, Sepolia o Polygon). Su propósito es gestionar la logística, el inventario y la cadena de custodia en el combate de **Incendios Forestales** y la ejecución de **Quemas Controladas** preventivas.

## 📋 Requisitos Previos

Antes de comenzar, asegúrese de tener instalado:
- **Node.js** (v18 o superior)
- **NPM** (v9 o superior)
- **Foundry** (Forge, Anvil, Cast) - [Instrucciones de instalación](https://book.getfoundry.sh/getting-started/installation)
- **jq** (Herramienta para procesar JSON en scripts) - `sudo apt install jq` (en Linux/WSL)

## 🚀 Guía de Instalación Rápida

Siga estos pasos para poner en marcha el sistema en su máquina local:

### 1. Clonar el repositorio e instalar dependencias
```bash
# Instalar dependencias del core y herramientas
npm install

# Instalar dependencias del frontend
cd frontend
npm install
cd ..
```

### 2. Configuración de Variables de Entorno
```bash
# Crear el archivo .env a partir del ejemplo
cp .env.example .env
```
*Nota: El archivo `.env` ya viene pre-configurado para funcionar en `localhost` (127.0.0.1).*

### 3. TERMINAL A: Iniciar la Blockchain Local (Anvil)
Abra una **primera terminal** y ejecute:
```bash
npm run start-anvil
```
*Este comando inicia Anvil con 20 cuentas predeterminadas y persistencia de estado. Mantenga esta terminal abierta.*

### 4. TERMINAL B: Despliegue Maestro (Bootstrap)
Abra una **segunda terminal** y ejecute el script de inicialización automática:
```bash
npm run bootstrap
```
*Este script automatiza:*
1. Despliegue del Smart Contract.
2. Sincronización de la dirección del contrato en el `.env` y el Frontend.
3. Sincronización de ABIs.
4. Carga inicial de identidades tácticas (Alice, Bob, Sung, etc.).

*Nota: Se recomienda esperar a que este proceso termine antes de interactuar con la web para asegurar que todos los roles y recursos estén disponibles en la Blockchain.*

### 5. TERMINAL C: Iniciar la Interfaz Web (Frontend)
Abra una **tercera terminal** y ejecute:
```bash
cd frontend
npm run dev
```
Acceda a [http://localhost:5173](http://localhost:5173) en su navegador para interactuar con el sistema.


---

## 🔄 Reanudación del Sistema (Persistencia)

FireOPS cuenta con **persistencia de estado**. Si detiene los servicios o reinicia su equipo, puede retomar la simulación exactamente donde la dejó:

1. **Terminal A**: Ejecute `npm run start-anvil`. Anvil cargará automáticamente el archivo `blockchain_state.json`.
2. **MetaMask**: Es **obligatorio** realizar un "Reset de Cuenta" (`Configuración > Avanzado > Borrar datos de actividad`) para sincronizar los bloques.
3. **Terminal B**: Ejecute el Frontend directamente (`cd frontend && npm run dev`).

> [!PRECAUCION]
> **NO EJECUTE `npm run bootstrap`** si desea mantener los datos actuales. El comando bootstrap despliega un contrato nuevo y sobreescribirá toda la historia registrada en el JSON. Use bootstrap solo para el primer despliegue o para limpiar el sistema por completo.


---

## 🖥️ Opción Avanzada: Centro de Mando Táctico (Dashboard) 

Si desea un centro de mando profesional y monitoreo del despliegue en tiempo real, puede instalar **tmux** y ejecutar el siguiente comando, el cual **reemplaza por completo los pasos 3, 4 y 5** detallados anteriormente:

```bash
npm run monitor
```
*Este comando arranca todo el ecosistema (Anvil + Bootstrap + Frontend + Logs) en una sola terminal unificada, dividiendo su pantalla en 4 paneles operativos para una visión táctica total de la red.*


---

## 🛠️ Credenciales de Prueba (Metamask)
Para interactuar con la dApp, importe las siguientes cuentas predeterminadas de Anvil en Metamask:

| Actor | Cuenta # | Dirección | Rol en Sistema |
| :--- | :---: | :--- | :--- |
| **Administrador** | 0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Gestión Global / Auditor |
| **Base Operativa** | 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | Alice Liang - Logística / Devoluciones |
| **Jefe de Escena** | 4 | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | Aura Frasier (Cmdte Incidentes) |
| **Brigadista** | 7 | `0x14dC79964da2C08b23698B3D3cc7Ca32193d9955` | Sung Jin-woo (Personal Campo) |

*Clave Privada General (Cta #0): `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`*

---

## 📄 Documentación Adicional
- [Informe Técnico](Documentacion/Evidencias_Informe.md)
- [Libreto de Simulación](Documentacion/Libreto_Simulacion_ver2.md)
- [Arquitectura de Datos](Documentacion/88_Trazabilidad_Logistica.md)

**Desarrollado por:** CBT
**Propósito:** PFM Ethereum para CodeCrypto Academy.
