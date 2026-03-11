# Informe de Evidencias - Trazabilidad Logística

Este documento servirá como el registro oficial de capturas de pantalla, logs y resultados de pruebas realizados durante cada fase del proyecto.

## Fase 1: Configuración, Persistencia y Conectividad

Conexión a Anvil mediante script

![01_Conexion_Anvil01](imagenes/01_Conexion_Anvil01.png)
![01_Conexion_Anvil02](imagenes/01_Conexion_Anvil02.png)
![01_Conexion_Anvil03](imagenes/01_Conexion_Anvil03.png)

ebit@DESKTOP-QKHOJLB:~/projects/0 CodeCrypto Academy/03 Ethereum Practice/Intro a Proyectos de Entrenamiento/Proyectos obligatorios/88_Traz_Log$ ./scripts/start_anvil.sh
Configuración detectada en config.js:
 - Cuentas: 20
 - Archivo de Estado: blockchain_state.json
 - IP Escucha (Bind): 0.0.0.0
 - IP Conexión (Public): 192.168.100.9
Arrancando Anvil...


                             _   _
                            (_) | |
      __ _   _ __   __   __  _  | |
     / _` | | '_ \  \ \ / / | | | |
    | (_| | | | | |  \ V /  | | | |
     \__,_| |_| |_|   \_/   |_| |_|

    1.5.1-stable (b0a9dd9ced 2025-12-22T11:39:01.425730780Z)
    https://github.com/foundry-rs/foundry

Available Accounts
==================

(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000.000000000000000000 ETH)
(1) 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000.000000000000000000 ETH)
(2) 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (10000.000000000000000000 ETH)
(3) 0x90F79bf6EB2c4f870365E785982E1f101E93b906 (10000.000000000000000000 ETH)
(4) 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 (10000.000000000000000000 ETH)
(5) 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc (10000.000000000000000000 ETH)
(6) 0x976EA74026E726554dB657fA54763abd0C3a0aa9 (10000.000000000000000000 ETH)
(7) 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955 (10000.000000000000000000 ETH)
(8) 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f (10000.000000000000000000 ETH)
(9) 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720 (10000.000000000000000000 ETH)
(10) 0xBcd4042DE499D14e55001CcbB24a551F3b954096 (10000.000000000000000000 ETH)
(11) 0x71bE63f3384f5fb98995898A86B02Fb2426c5788 (10000.000000000000000000 ETH)
(12) 0xFABB0ac9d68B0B445fB7357272Ff202C5651694a (10000.000000000000000000 ETH)
(13) 0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec (10000.000000000000000000 ETH)
(14) 0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097 (10000.000000000000000000 ETH)
(15) 0xcd3B766CCDd6AE721141F452C550Ca635964ce71 (10000.000000000000000000 ETH)
(16) 0x2546BcD3c84621e976D8185a91A922aE77ECEc30 (10000.000000000000000000 ETH)
(17) 0xbDA5747bFD65F08deb54cb465eB87D40e51B197E (10000.000000000000000000 ETH)
(18) 0xdD2FD4581271e230360230F9337D5c0430Bf44C0 (10000.000000000000000000 ETH)
(19) 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199 (10000.000000000000000000 ETH)

Private Keys
==================

(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
(1) 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
(2) 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
(3) 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
(4) 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a
(5) 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba
(6) 0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e
(7) 0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356
(8) 0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97
(9) 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6
(10) 0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897
(11) 0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82
(12) 0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1
(13) 0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd
(14) 0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa
(15) 0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61
(16) 0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0
(17) 0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd
(18) 0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0
(19) 0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e

Wallet
==================
Mnemonic:          test test test test test test test test test test test junk
Derivation path:   m/44'/60'/0'/0/


Chain ID
==================

31337

Base Fee
==================

1000000000

Gas Limit
==================

30000000

Genesis Timestamp
==================

1773016123

Genesis Number
==================

0

Listening on 0.0.0.0:8545

### Archivos de Referencia - Fase 1
- [start_anvil.sh](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz%20Log/scripts/start_anvil.sh) - Script de arranque persistente.
- [config.js](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz%20Log/src/config/config.js) - Configuración centralizada de IP y cuentas.




## Fase 2: Smart Contract e Inventario Real

Desarrollo del Smart Contract `TrazabilidadLogistica.sol`:
- Implementación de roles con `AccessControl`.
- Estructuras para `Personal`, `Insumo`, `EventoIncendio` y `LogOperativo`.
- Funciones de registro, asignación y auditoría.

Listado de Insumos Reales identificados para carga inicial (Nomenclatura ID-XXYYY):
1. **ID-HZ001**: Herramienta de Zapa (Raspado)
2. **ID-MA001**: Machete de corte denso
3. **ID-PL001**: Pulaski (Hacha/Azadón)
4. **ID-MC001**: McLeod (Suelo Mineral)
5. **ID-BF001/010**: Batefuegos (10 unidades individuales)
6. **ID-PA001**: Pala Forestal
7. **ID-MB001**: Motobomba Mark-3
8. **ID-MG001**: Manguera de incendio
9. **ID-MX001**: Mochila de Agua (20L)
10. **ID-V4001**: Vehículo 4x4 Brigada
11. **ID-AM001**: Ambulancia
12. **ID-TC001**: Tanquero Cisterna (2000G)
13. **ID-RD001**: Radio Motorola DGP
14. **ID-GP001**: GPS Garmin
15. **ID-CS/GT/BT/MS**: Equipo de Protección (EPI)

**Sincronización y Auditoría Automática:**
- Configuración de `TIMEZONE_OFFSET: -5` en `config.js` para visualización local de eventos registrados en UTC (Ecuador).
- **Auditoría de Consumo**: El sistema calcula `ConsumoEsperado = (TiempoUso * consumoNominal)` y genera alertas ante desviaciones significativas (>20%) entre el reporte de campo y el consumo nominal.
- Lógica de integridad mediante comparación de `EstadoInsumo` (Base) y `EstadoReportado` (Campo).

### Archivos de Referencia - Fase 2
- [TrazabilidadLogistica.sol](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/contracts/TrazabilidadLogistica.sol) - Lógica del Smart Contract.
- [seed_inventory.js](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz%20Log/scripts/seed_inventory.js) - Script de carga de inventario real.
- [package.json](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz%20Log/package.json) - Gestión de dependencias (OpenZeppelin).

## Fase 3: Gestión de Incidentes - Pruebas e Integridad

Se ha validado la lógica del contrato mediante una suite de **14 pruebas unitarias** en **Foundry**, asegurando una cobertura integral de los controles de acceso, la lógica de combate y la auditoría automática.

### Pruebas Unitarias Ejecutadas:
- `testRegistroInsumo`: Verifica la carga de datos y consumo nominal.
- `testFlujoIncidenteyConsumo`: Simula el ciclo completo de un incendio y valida la **Alerta de Consumo** automática.
- `testDiscrepanciaEstado`: Valida alertas ante inconsistencias en el reporte físico.
- **Tests de Seguridad**: 5 pruebas de reversión que validan que solo usuarios autorizados (Roles) puedan ejecutar funciones críticas.
- **Tests de Emergencia**: Verificación del sistema de Pausa (`Pausable`).

**Resultados de la Consola (Foundry):**
```bash
Ran 16 tests for test/TrazabilidadLogistica.t.sol:TrazabilidadLogisticaTest
[PASS] testAbrirEventoIncendio() (gas: 167803)
[PASS] testAsignarInsumo() (gas: 464200)
[PASS] testCerrarIncidente() (gas: 170667)
[PASS] testPausaYEmergencia() (gas: 180702)
[PASS] testRegistrarHito() (gas: 585456)
[PASS] testRegistrarInsumosBatch() (gas: 318768)
[PASS] testRegistrarInsumosBatchSilentSkip() (gas: 322001)
[PASS] testRegistrarPersonal() (gas: 139984)
[PASS] testRegistroInsumo() (gas: 163150)
[PASS] testRetornoConAlertaConsumo() (gas: 452589)
[PASS] testRetornoConDiscrepanciaEstado() (gas: 572250)
[PASS] test_RevertWhen_AsignarInsumoNoDisponible() (gas: 465086)
[PASS] test_RevertWhen_CerrarIncidentePorOperador() (gas: 202491)
[PASS] test_RevertWhen_PausaSinAdmin() (gas: 48770)
[PASS] test_RevertWhen_RegistrarPersonalSinAdmin() (gas: 51305)
[PASS] test_RevertWhen_RegistroInsumoDuplicado() (gas: 140301)
Suite result: ok. 16 passed; 0 failed; 0 skipped
```

> [!IMPORTANTE]
> **Análisis de Viabilidad Financiera (Mainnet/Sepolia)**
> Considerando un costo de red típico de **20 Gwei** (Gas Price) y un valor de mercado de **$2,300 USD por ETH**, el costo operativo del sistema se desglosa de la siguiente manera:
> - **Despliegue Único**: ~3.2M de gas -> **$149.74 USD** (Inversión inicial en infraestructura).
> - **Costo Operativo Promedio**: Un registro completo de incidente (apertura, asignación de equipo, hito y cierre) consume un promedio de 450k de gas, lo que equivale a **$20.70 USD** por evento.
> - **Consulta de Datos**: Las funciones de consulta (lectura) no generan costo de gas para el usuario final desde la interfaz.

#### Mapeo de Funciones vs Tests (Blindaje del Smart Contract)
Esta tabla detalla cómo cada una de las **9 funciones** del contrato está protegida por la suite de pruebas, incluyendo escenarios de éxito y controles de seguridad (Bloqueos/Reverts).

| # | Función del Contrato (`.sol`) | Tests de Prueba (`.t.sol`) | ¿Qué se evalúa? |
| :--- | :--- | :--- | :--- |
| **1** | `registrarPersonal` | `testRegistrarPersonal` | **Éxito**: El admin registra un brigadista. |
| | | `test_RevertWhen_RegistrarPersonalSinAdmin` | **Fallo**: Un usuario sin rol intenta registrar personal. |
| **2** | `registrarInsumo` | `testRegistroInsumo` | **Operación**: Registro individual de ítems. |
| **2.1** | `registrarInsumosBatch` | `testRegistrarInsumosBatch` | **Eficiencia**: Carga masiva (CSV) con una sola firma. |
| | | `testRegistrarInsumosBatchSilentSkip` | **Robustez**: Salto silencioso si detecta duplicados. |
| | | `test_RevertWhen_RegistroInsumoDuplicado` | **Seguridad**: Evitar duplicados en registro manual unitario. |
| **3** | `abrirEventoIncendio` | `testAbrirEventoIncendio` | **Éxito**: Creación de bitácora con coordenadas. |
| **4** | `asignarInsumo` | `testAsignarInsumo` | **Éxito**: Entrega de equipo al brigadista. |
| | | `test_RevertWhen_AsignarInsumoNoDisponible` | **Fallo**: Entregar equipo que ya está en el campo. |
| **5** | `registrarHito` | `testRegistrarHito` | **Éxito**: Reporte de actividad desde el incendio. |
| **6** | `cerrarIncidente` | `testCerrarIncidente` | **Éxito**: Cierre de bitácora por el Jefe de Escena. |
| | | `test_RevertWhen_CerrarIncidentePorOperador` | **Seguridad**: Un operador NO puede cerrar el evento. |
| **7** | `retornarInsumo` | `testRetornoConAlertaConsumo` | **Lógica**: Auditoría automática de combustible/agua. |
| | | `testRetornoConDiscrepanciaEstado` | **Integridad**: Alerta si el estado físico es distinto al reportado. |
| **8** | `pause` | `testPausaYEmergencia` | **Operación**: Congelar el contrato por emergencia. |
| | | `test_RevertWhen_PausaSinAdmin` | **Seguridad**: Solo el admin puede pausar. |
| **9** | `unpause` | `testPausaYEmergencia` | **Operación**: Reactivar el contrato tras una pausa. |

![02_Tests_Foundry](imagenes/02_Test_de_Prueba01.png)
![02_Tests_Foundry_Costos02](imagenes/02_Test_de_Prueba02_Costo_Gas.png)
![02_Tests_Foundry_Costos03](imagenes/02_Test_de_Prueba03_Costo_Gas.png)
![02_Tests_Foundry_Costos04](imagenes/02_Test_de_Prueba04_Costo_Gas.png)

### Despliegue en Red Local (Anvil)
- **Dirección del Contrato**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Hash de Despliegue**: `0x7410016d8bf21e91e34d34be03a74f27a2d873629fe74836788073cab5c02dac`
- **Carga de Inventario (Seed)**: 23 ítems registrados exitosamente (Hash: `0xf9f38a82...`).
- **Estado Técnico**: Contrato verificado, funcional y con gobernanza de roles activa.

### Archivos de Referencia - Fase 3
- [TrazabilidadLogistica.t.sol](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/test/TrazabilidadLogistica.t.sol) - Suite de pruebas unitarias.
- [foundry.toml](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/foundry.toml) - Configuración del entorno de pruebas.

## Fase 4: Interfaz Web3 de Despliegue
*Pendiente de ejecución*

## Fase 5: Panel de Control FireOps
*Pendiente de ejecución*

## Fase 6: Auditoría y Cierre
*Pendiente de ejecución*

## Fase 7: Cierre y Documentación Final
*Pendiente de ejecución*
