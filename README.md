# FireOPS: Trazabilidad Logística en Incendios Forestales y Eventos de Quema Controlada 🚒🛡️🔗

Este proyecto es una Aplicación Descentralizada (dApp) basada en tecnología **Blockchain (EVM)** y diseñada para ser desplegada en redes de la familia **Ethereum** (como Mainnet, Sepolia o Polygon). Su propósito es gestionar la logística, el inventario y la cadena de custodia en el combate de **Incendios Forestales** y la ejecución de **Quemas Controladas** preventivas.

## 📋 Requisitos Previos

Antes de comenzar, asegúrese de tener instalado:
- **Node.js** (v18 o superior)
- **NPM** (v9 o superior)
- **Foundry** (Forge, Anvil, Cast) - [Instrucciones de instalación](https://book.getfoundry.sh/getting-started/installation)
- **jq** (Herramienta para procesar JSON en scripts) - `sudo apt install jq` (en Linux/WSL)

## 🚀 Guía de Instalación para Tenderly

Siga estos pasos para poner en marcha el sistema en su entorno de Tenderly.

### 1. Clonar el repositorio e instalar dependencias
```bash
# Instalar dependencias del core y herramientas
npm install

# Instalar dependencias del frontend
cd frontend
npm install
cd ..
```

### 2. Configuración de Variables de Entorno para Tenderly
Este es el paso más importante.
```bash
# Crear el archivo .env a partir del ejemplo
cp .env.example .env
```
Ahora, **abra el archivo `.env`** y rellene las siguientes variables con los datos de **su proyecto en Tenderly**:

- `RPC_URL`: La URL RPC de su fork de Tenderly.
- `PRIVATE_KEY`: La clave privada de la cuenta que usará para desplegar el contrato.
- `CHAIN_ID`: El Chain ID de su red de Tenderly.
- `BASE_OPERATIVA_ADDR`, `JEFE_ESCENA_AURA_ADDR`, etc: Las direcciones de las cuentas que desea usar para cada rol. Estas deben ser cuentas que usted controle en su fork.

### 3. Despliegue del Contrato en Tenderly
Abra una terminal y ejecute:
```bash
npm run bootstrap
```
*Este script automatiza:*
1.  Despliegue del Smart Contract en la red Tenderly especificada en su `.env`.
2.  Sincronización de la dirección del nuevo contrato en el `.env` y el Frontend.
3.  Sincronización del ABI del contrato.
4.  Carga inicial de identidades tácticas (Alice, Bob, etc.) usando las direcciones que configuró.

Una vez finalizado, su contrato estará vivo y configurado en Tenderly.

### 4. Iniciar la Interfaz Web y Monitoreo
Para una experiencia de desarrollo completa, utilice el dashboard de `tmux`:
```bash
npm run monitor
```
Este comando unificado iniciará:
- Un panel con el **servidor de desarrollo del frontend**.
- Un panel para **visualizar los logs** de operaciones.
- Dos **consolas limpias** para ejecutar comandos (`git`, etc.).

Acceda a [http://localhost:5173](http://localhost:5173) en su navegador para interactuar con el sistema.

---

## 🔄 Persistencia del Estado en Tenderly

A diferencia del entorno local con Anvil, el estado de la blockchain ahora es manejado por **Tenderly**. Su fork de Tenderly es persistente por naturaleza. No necesita `blockchain_state.json` ni comandos especiales para reanudar su trabajo. Simplemente inicie el frontend (`npm run monitor`) y conéctese con Metamask a la red de Tenderly.

---

## 🛠️ Credenciales de Prueba (Metamask)
Para interactuar con la dApp, debe importar en Metamask las cuentas cuyas **claves privadas** correspondan a las **direcciones que usted configuró** en el archivo `.env` para los diferentes roles (`BASE_OPERATIVA_ADDR`, `JEFE_ESCENA_AURA_ADDR`, etc.).

La tabla de actores/roles sigue siendo la misma, pero las direcciones ahora son las suyas:

| Actor | Variable en .env | Rol en Sistema |
| :--- | :--- | :--- |
| **Administrador** | Dueño de `PRIVATE_KEY` | Gestión Global / Auditor |
| **Base Operativa** | `BASE_OPERATIVA_ADDR` | Alice Liang - Logística / Devoluciones |
| **Jefe de Escena** | `JEFE_ESCENA_AURA_ADDR` | Aura Frasier (Cmdte Incidentes) |
| **Brigadista** | `OPERADOR_SUNG_ADDR` | Sung Jin-woo (Personal Campo) |

---

## 📄 Documentación Adicional
- [Informe Técnico](Documentacion/Evidencias_Informe.md)
- [Libreto de Simulación](Documentacion/Libreto_Simulacion_ver2.md)
- [Arquitectura de Datos](Documentacion/88_Trazabilidad_Logistica.md)

**Desarrollado por:** CBT
**Propósito:** PFM Ethereum para CodeCrypto Academy.
