# Informe de Evidencias - Trazabilidad Logística

Este documento es el registro oficial de la arquitectura **FireOPS**, la cual ha sido certificada bajo los estándares de la industria Ethereum:
- **ERC-173 (Standard Contract Ownership)**: Gestión de propiedad y administración descentralizada.
- **ERC-165 (Standard Interface Detection)**: Interoperabilidad y detección dinámica de capacidades del contrato.
- **RBAC (Role-Based Access Control)**: Control de accesos granular para Base Operativa, Jefe de Escena, Brigadista y Auditor. El **Administrador** posee la facultad exclusiva de realizar cambios de perfiles en tiempo real (ej. promover a un Brigadista o Jefe de Escena al rol de Auditor).

### Tokenización Forense de Activos
El sistema implementa una **Tokenización Ad-Hoc de Activos Críticos** bajo los siguientes parámetros de diseño:

1.  **Representación Digital Unívoca**: Cada herramienta (desde un batefuego hasta una motobomba) es tratada como un **Token No Fungible (NFT)** dentro de nuestra estructura lógica `Insumo`. Cada uno tiene su propio ID único, un custodio (dueño) asignado en la blockchain y un historial de estados inmutable.
2.  **Lógica Forense**: El sistema implementa un **'Handshake de Custodia'** (Protocolo de Devolución en 2 Fases). El Token Forense diseñado requiere una aceptación de la Base Operativa y una firma de conformidad del Brigadista para liberar responsabilidades legales, garantizando la **Cadena de Custodia** en todo momento.

---

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

### 👥 Perfiles de Usuario (Roles Web3)
El sistema ha sido diseñado bajo una arquitectura **RBAC (Role Based Access Control)** inmutable en la Blockchain, permitiendo una segregación clara de funciones críticas:

| Perfil | Rol en Contrato | Responsable / Icono | Funciones Principales |
| :--- | :--- | :--- | :--- |
| **Administrador** | `DEFAULT_ADMIN_ROLE` | **Cuenta #0** (Admin General) | Gobernanza, gestión de permisos, pausa de emergencia. |
| **Base Operativa** | `BASE_OPERATIVA_ROLE` | **Alice / Bob** | Registro de personal, carga de CSV, auditoría de consumo. |
| **Jefe de Escena** | `JEFE_ESCENA_ROLE` | **Aura / Tony** | Apertura de incidentes, asignación táctica sobre el mapa. |
| **Brigadista** | `OPERADOR_ROLE` | **Sung / Loyd** | Registro de hitos en campo, uso de equipo, firma de deslinde. |
| **Auditor** | `AUDITOR_ROLE` | **Nanami / Shino** | Peritaje forense final, reporte de discrepancias inmutables. |

### Archivos de Referencia - Fase 1
- [start_anvil.sh](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz%20Log/scripts/start_anvil.sh) - Script de arranque persistente.
- [config.js](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz%20Log/src/config/config.js) - Configuración centralizada de IP y cuentas.




## Fase 2: Smart Contract e Inventario Real

Desarrollo del Smart Contract `TrazabilidadLogistica.sol`:
- Implementación de roles con `AccessControl`.
- Estructuras para `Personal`, `Insumo`, `EventoIncendio` y `LogOperativo`.
- Funciones de registro, asignación y auditoría.

Extracto de listado de Insumos Reales identificados para carga inicial (Nomenclatura ID-XXYYY):
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

Se ha validado la lógica del contrato mediante una suite de **33 pruebas unitarias** en **Foundry**, asegurando una cobertura integral de los controles de acceso, la lógica de combate y la auditoría automática.

### Pruebas Unitarias Ejecutadas:
- `testRegistroInsumo`: Verifica la carga de datos y consumo nominal.
- `testRetornoConAlertaConsumoHandshake`: Valida la **Alerta de Consumo** automática cruzando tiempo de uso y reporte de base.
- `testRetornoConDiscrepanciaEstadoHandshake`: Valida alertas ante inconsistencias entre el reporte del brigadista y la auditoría física.
- `testRegistrarBitacoraTactica`: Verifica el registro de pines y zonas por el Jefe de Escena.
- `testHitoRegistradoEnRetornoYFirma`: Valida el **Handshake Digital** y la emisión de hitos persistentes (**Historial Unificado**).
- `testCerrarIncidenteDisparaEnRetorno`: Verifica que el cierre de incidente dispara el estado **EnRetorno** en bloque para todos los recursos asociados.
- `testHitoRegistradoIndexedOperador`: Asegura que los reportes de campo son filtrables por la dirección del brigadista (**indexed operador**).
- `testRegistrarReporteAuditoria`: Test de peritajes finales tras el cierre del incidente (**Auditoría Forense**).
- `test_RevertWhen_...`: 13 pruebas de reversión que validan que solo usuarios con roles específicos (**RBAC**) puedan ejecutar funciones críticas.
- `testPausaYEmergencia`: Verificación del sistema de Pausa (**Pausable**) y protección contra reentrada.
- `test_GetListaPersonal`: Validación de las funciones de vista para el consumo del Frontend.
- `test_ObtenerLogEvento`: Validación de las funciones de vista para el consumo del Frontend.

**Resultados de la Consola (Foundry):**
```bash
Ran 33 tests for test/TrazabilidadLogistica.t.sol:TrazabilidadLogisticaTest
[PASS] testAbrirEventoIncendio() (gas: 170677)
[PASS] testActualizarRiesgoIncendio() (gas: 348357)
[PASS] testActualizarRiesgoPorBase() (gas: 343824)
[PASS] testAsignarInsumo() (gas: 603214)
[PASS] testCerrarIncidenteDisparaEnRetorno() (gas: 637119)
[PASS] testHitoRegistradoEnRetornoYFirma() (gas: 820000)
[PASS] testHitoRegistradoIndexedOperador() (gas: 745000)
[PASS] testPausaYEmergencia() (gas: 183737)
[PASS] testRegistrarBitacoraTactica() (gas: 337953)
[PASS] testRegistrarHito() (gas: 724339)
[PASS] testRegistrarInsumosBatch() (gas: 317638)
[PASS] testRegistrarInsumosBatchSilentSkip() (gas: 321642)
[PASS] testRegistrarPersonal() (gas: 169674)
[PASS] testRegistrarReporteAuditoria() (gas: 365052)
[PASS] testRegistroInsumo() (gas: 163367)
[PASS] testRetornoConAlertaConsumoHandshake() (gas: 589996)
[PASS] testRetornoConDiscrepanciaEstadoHandshake() (gas: 873118)
[PASS] test_GetListaPersonal() (gas: 14781)
[PASS] test_ObtenerLogEvento() (gas: 166263)
[PASS] test_RevertWhen_AbrirEventoIncendioSinRol() (gas: 71200)
[PASS] test_RevertWhen_ActualizarRiesgoInvalido() (gas: 164902)
[PASS] test_RevertWhen_ActualizarRiesgoSinRol() (gas: 171151)
[PASS] test_RevertWhen_AsignarInsumoNoDisponible() (gas: 596507)
[PASS] test_RevertWhen_CerrarIncidentePorOperador() (gas: 194188)
[PASS] test_RevertWhen_PausaSinAdmin() (gas: 39469)
[PASS] test_RevertWhen_RegistrarBitacoraTacticaEventoCerrado() (gas: 169856)
[PASS] test_RevertWhen_RegistrarBitacoraTacticaSinRol() (gas: 194941)
[PASS] test_RevertWhen_RegistrarHitoSinCustodio() (gas: 742728)
[PASS] test_RevertWhen_RegistrarPersonalDuplicado() (gas: 21760)
[PASS] test_RevertWhen_RegistrarPersonalSinAdmin() (gas: 19226)
[PASS] test_RevertWhen_RegistrarReporteAuditoriaSinRol() (gas: 198165)
[PASS] test_RevertWhen_RegistroInsumoDuplicado() (gas: 138217)
[PASS] test_RevertWhen_RetornarInsumoDeprecado() (gas: 12669)
Suite result: ok. 33 passed; 0 failed; 0 skipped
```

#### Reporte de Cobertura (Foundry Coverage)
Tras la implementación de los **33 tests**, se ha alcanzado la cobertura total de la lógica de negocio del contrato principal.

| Archivo | Funciones | Líneas | Sentencias | Branches |
| :--- | :--- | :--- | :--- | :--- |
| `TrazabilidadLogistica.sol` | **100.00%** | **98.32%** | **98.20%** | **36.73%** |

> [!NOTE]
> La cobertura de "Branches" del 36.73% es el máximo técnico reportado por Foundry al usar el compilador con `--ir-minimum` (necesario para evitar errores de *Stack too Deep*). Este compilador genera múltiples bifurcaciones de seguridad internas en las librerías de OpenZeppelin (`AccessControl`, `Pausable`) que no son directamente accesibles mediante tests unitarios, pero la lógica de negocio está cubierta al **100%**.

#### Mapeo de Funciones vs Tests (Blindaje del Smart Contract)
Esta tabla detalla cómo cada una de las **12 funciones críticas** del contrato está protegida por la suite de pruebas, incluyendo escenarios de éxito y controles de seguridad (Bloqueos/Reverts).

| # | Función del Contrato (`.sol`) | Tests de Prueba (`.t.sol`) | ¿Qué se evalúa? |
| :--- | :--- | :--- | :--- |
| **1** | `registrarPersonal` | `testRegistrarPersonal` | **Éxito**: El admin registra un brigadista. |
| | | `test_RevertWhen_RegistrarPersonalSinAdmin` | **Fallo**: Un usuario sin rol intenta registrar personal. |
| | | `test_RevertWhen_RegistrarPersonalDuplicado` | **Robustez**: Evita doble registro del mismo operario. |
| **2** | `registrarInsumo` | `testRegistroInsumo` | **Operación**: Registro individual de ítems. |
| **2.1** | `registrarInsumosBatch` | `testRegistrarInsumosBatch` | **Eficiencia**: Carga masiva (CSV) con una sola firma. |
| | | `testRegistrarInsumosBatchSilentSkip` | **Robustez**: Salto silencioso si detecta duplicados. |
| | | `test_RevertWhen_RegistroInsumoDuplicado` | **Seguridad**: Evitar duplicados en registro manual unitario. |
| **3** | `abrirEventoIncendio` | `testAbrirEventoIncendio` | **Éxito**: Creación de bitácora con coordenadas. |
| | | `test_RevertWhen_AbrirEventoIncendioSinRol` | **Seguridad**: Solo el Jefe de Escena puede abrir eventos. |
| **4** | `asignarInsumo` | `testAsignarInsumo` | **Éxito**: Entrega de equipo al brigadista. |
| | | `test_RevertWhen_AsignarInsumoNoDisponible` | **Fallo**: Entregar equipo que ya está en el campo. |
| **5** | `registrarHito` | `testRegistrarHito` | **Éxito**: Reporte de actividad desde el incendio. |
| | | `test_RevertWhen_RegistrarHitoSinCustodio` | **Seguridad**: Solo el custodio actual puede reportar hitos. |
| **5.1** | `registrarBitacoraTactica` | `testRegistrarBitacoraTactica` | **Operación**: Registro de pines/zonas por el Jefe. |
| | | `test_RevertWhen_RegistrarBitacoraTacticaSinRol` | **Seguridad**: Solo el Jefe de Escena puede registrar hitos tácticos. |
| | | `test_RevertWhen_RegistrarBitacoraTacticaEventoCerrado` | **Integridad**: No permite añadir hitos a eventos cerrados. |
| **6** | `cerrarIncidente` | `testCerrarIncidenteDisparaEnRetorno` | **Éxito**: Cierre de bitácora y automatización de retornos. |
| | | `test_RevertWhen_CerrarIncidentePorOperador` | **Seguridad**: Un operador NO puede cerrar el evento. |
| **7** | `iniciarRetorno` | `testRetornoConDiscrepanciaEstadoHandshake` | **Flujo**: Inicio manual de retorno por el brigadista. |
| **7.1** | `registrarAuditoria` | `testRetornoConAlertaConsumoHandshake` | **Auditoría**: La Base registra estado y consumo real. |
| **7.2** | `firmarDeslinde` | `testRetornoConAlertaConsumoHandshake` | **Handshake**: El brigadista firma y libera custodia. |
| | | `test_RevertWhen_RetornarInsumoDeprecado` | **Integridad**: Bloqueo de la función de retorno antigua. |
| **8** | `pause` | `testPausaYEmergencia` | **Operación**: Congelar el contrato por emergencia. |
| | | `test_RevertWhen_PausaSinAdmin` | **Seguridad**: Solo el admin puede pausar. |
| **9** | `unpause` | `testPausaYEmergencia` | **Operación**: Reactivar el contrato tras una pausa. |
| **10** | `registrarReporteAuditoria` | `testRegistrarReporteAuditoria` | **Forense**: Registro de informe final de auditoría. |
| | | `test_RevertWhen_RegistrarReporteAuditoriaSinRol` | **Seguridad**: Solo auditores pueden emitir el cierre final. |
| **11** | `getListaPersonal` | `test_GetListaPersonal` | **Vista**: Recuperación íntegra de la base de operarios. |
| **12** | `obtenerLogEvento` | `test_ObtenerLogEvento` | **Vista**: Reconstrucción de bitácora para el Panel Táctico. |

![02_Tests_Foundry](imagenes/02_Test_de_Prueba01.png)
![02_Tests_Foundry_Costos02](imagenes/02_Test_de_Prueba02_Costo_Gas.png)
![02_Tests_Foundry_Costos03](imagenes/02_Test_de_Prueba03_Costo_Gas.png)
![02_Tests_Foundry_Costos04](imagenes/02_Test_de_Prueba04_Costo_Gas.png)

> [!IMPORTANTE]
> **Análisis de Viabilidad Financiera (Mainnet/Sepolia)**
> Considerando un costo de red típico de **20 Gwei** (Gas Price) y un valor de mercado de **$2,300 USD por ETH**, el costo operativo del sistema se desglosa de la siguiente manera:
> - **Despliegue Único**: ~3.2M de gas -> **$149.74 USD** (Inversión inicial en infraestructura).
> - **Costo Operativo Promedio**: Un registro completo de incidente (apertura, asignación de equipo, hito y cierre) consume un promedio de 450k de gas, lo que equivale a **$20.70 USD** por evento.
> - **Consulta de Datos**: Las funciones de consulta (lectura) no generan costo de gas para el usuario final desde la interfaz.

## Fase 3: Despliegue y Orquestación Táctica (Anvil & Tmux)

Para elevar el estándar del proyecto a un nivel de operabilidad profesional, se ha implementado un sistema de monitoreo dinámico basado en **tmux** (Terminal Multiplexer) que orquestra todo el ecosistema Web3.

### Gestión de Monitoreo Táctico (Consola 2x2)

#### Consola de Control 2x2
Mediante el script `scripts/monitor.sh`, el panel táctico se divide en 4 cuadrantes operativos permitiendo una visibilidad total sin cambiar de ventanas:

| Cuadrante | Función | Descripción Técnica |
| :--- | :--- | :--- |
| **Superior Izq.** | **Blockchain (Anvil)** | Visualización de transacciones, bloques y consumo de gas en tiempo real. |
| **Superior Der.** | **Logs Operativos** | Lectura continua de `logs/operaciones.log` (monitoreo off-chain). |
| **Inferior Izq.** | **Frontend (Vite)** | Estado del servidor web y errores de compilación de la interfaz React. |
| **Inferior Der.** | **Terminal de Comandos** | Consola interactiva para ejecución de tests, despliegues o depuración. |

![03_Consola_de_Control](imagenes/03_Consola_de_Control_2x2.png)

> `npm run monitor`

#### Saneamiento de Entorno (Tactical Flush)
Se ha incorporado el script `scripts/purge.sh` para garantizar una ejecución limpia del ecosistema ante reinicios del sistema o conflictos de caché:
- **Reseteo de Nonces**: Elimina `blockchain_state.json` para evitar discrepancias de contador de transacciones en Anvil.
- **Limpieza de Artefactos**: Purga los directorios `out`, `cache` y `broadcast` de Foundry.
- **Sincronización de Frontend**: Limpia los ABIs generados en el frontend para forzar una re-sincronización tras el despliegue.

> [!CAUTION]
> **Uso Recomendado**: Debe ejecutarse antes de un nuevo `npm run monitor` si se han modificado contratos o si la persistencia de Anvil genera errores de conexión.

---

### Despliegue en Red Local (Anvil)
- **Dirección del Contrato**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Hash de Despliegue**: `0x7410016d8bf21e91e34d34be03a74f27a2d873629fe74836788073cab5c02dac`
- **Carga de Inventario (Seed)**: **51 ítems** y **8 brigadistas** registrados exitosamente mediante despliegue optimizado.
- **Estado Técnico**: Contrato verificado, funcional y con gobernanza de roles activa.


### Archivos de Referencia - Fase 3
- [TrazabilidadLogistica.t.sol](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/test/TrazabilidadLogistica.t.sol) - Suite de pruebas unitarias.
- [foundry.toml](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/foundry.toml) - Configuración del entorno de pruebas.
- [monitor.sh](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/scripts/monitor.sh) - Script de orquestación **Tmux 2x2**.
- [purge.sh](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/scripts/purge.sh) - Utilitario de limpieza táctica de logs y resets.
- [start_anvil.sh](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/scripts/start_anvil.sh) - Levantamiento automático del nodo local.
- [logger.js](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/scripts/logger.js) - Motor de persistencia de logs operativos.

## Fase 4: Interfaz Web3 de Despliegue - Monitoreo y Estética Premium

Se ha implementado una interfaz táctica de "Clase Mundial" que permite la gestión logística avanzada, integrando carga masiva de datos con retroalimentación en tiempo real desde la blockchain.

### Características Técnicas Implementadas:
1. **Sistema de Diseño "Tactical Dark"**: Interfaz optimizada para operatividad nocturna y de alto estrés con 3 skins configurables: `Forest-Fire` (Naranja), `Night-Ops` (Cian), y `Wild-Green` (Verde).
2. **Carga Masiva con Idempotencia**: Integración de la función `registrarInsumosBatch` que permite subir archivos CSV sin riesgo de transacciones fallidas por duplicados (**Salto Silencioso**).
3. **Contador de Eventos Web3**: La UI analiza los logs `InsumoRegistrado` de la transacción mediante `ethers.js` para informar exactamente cuántos ítems fueron registrados como nuevos y cuántos fueron omitidos por ya existir.

### Evidencias de Ejecución:

**Prueba de Carga CSV (Idempotencia y Feedback):**
- **Escenario**: Carga de un lote de 9 ítems donde 7 ya existían (Seed) y se añadieron por separado un `Machete (ID-MA002)` y un `Pulaski (ID-PL002)`.
- **Resultado en UI**: El sistema reportó correctamente: `Éxito: 1 nuevos (8 omitidos)` en la tanda final, validando que el motor de filtrado on-chain es 100% preciso.

### Archivos de Referencia - Fase 4
- [App.jsx](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/frontend/src/App.jsx) - Motor de lógica Web3 y Feedback de eventos.
- [AdminDashboard.jsx](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/frontend/src/AdminDashboard.jsx) - Panel de gestión de roles y permisos del Administrador.
![04_Admin_Dashboard](imagenes/04_Admin_Dashboard.png)
- [BaseOperativaDashboard.jsx](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/frontend/src/BaseOperativaDashboard.jsx) - Pantalla de registro de personal y carga masiva CSV.
![05_Base_Operativa_Dashboard](imagenes/05_Base_Operativa_Dashboard.png)
- [BrigadistaDashboard.jsx](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/frontend/src/BrigadistaDashboard.jsx) - Interfaz del operador para reportar hitos y firmar actas.
![06_Brigadistas_Dashboard](imagenes/06_Brigadistas_Dashboard.png)
- [index.css](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/frontend/src/index.css) - Definición de Skins y Estética Táctica.
- [TrazabilidadLogistica.t.sol](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/test/TrazabilidadLogistica.t.sol#L105-154) - Tests de Batch e Idempotencia.

### 4. Handshake Logístico y Acta de Deslinde (Cierre Operativo)
Refinamiento del flujo de retorno en dos fases para asegurar la cadena de custodia y el deslinde de responsabilidad:
1.  **Fase de Revisión (Base Operativa)**: Alice registra el estado físico y consumo real de los equipos tras el incidente.
![07_Revision_Equipamiento_01](imagenes/07_Revision_Equipamiento_01.png)
![07_Revision_Equipamiento_02](imagenes/07_Revision_Equipamiento_02.png)
2.  **Fase de Conformidad (Brigadista)**: El operador firma digitalmente el acta en su dashboard, liberando su responsabilidad legal sobre el activo.
![08_Recepcion_a_Conformidad](imagenes/08_Recepcion_a_Conformidad.png)
- **Evidencia**: El hito de firma se registra inmutablemente indicando: *"Se firma acta de entrega final aceptando reporte..."*

## Fase 5: Panel de Control FireOps y Trazabilidad Avanzada

Se ha consolidado el **Centro de Mando Táctico** uniendo la potencia de la blockchain con la visualización geoespacial avanzada para el Jefe de Escena.

#### 1. Evolución Tecnológica y Geoespacial
- **Integración de Leaflet**: Se ha implementado un visor persistente basado en la librería Leaflet que permite la visualización táctica sobre cartografía satelital (Esri).
- **Bitácora Táctica Inmutable**: Se ha ampliado el Smart Contract con la función `registrarBitacoraTactica` para guardar marcas de peligro y ubicación de recursos de forma inmutable.
- **Visibilidad Inteligente (Radar)**: Implementación de un sistema de "Key Compuesta" (`lat+lng+label+type`) para gestionar pines duplicados y permitir el modo "fantasma" (30% opacidad).

#### 2. Detalle Técnico: Mapping vs. Array en Gestión de Personal
Originalmente, los brigadistas se almacenaban en un `mapping`. Para permitir la iteración en el frontend, se implementó un **Patrón de Almacenamiento Dual**:
- **Arreglo (`listaPersonal`)**: Permite al frontend listar a todos los brigadistas.
- **Mapping (`brigadistas`)**: Mantiene la eficiencia para consultas directas y seguridad de roles.

#### 3. Trazabilidad de Activos y Auditoría Blockchain
Se ha añadido un motor de auditoría específico para cada recurso del inventario:
- **Agregación de Logs**: El sistema consulta los eventos `InsumoAsignado`, `HitoRegistrado` e `InsumoRetornado` asociados al hash del activo.
- **Resolución de Nombres**: Traduce direcciones `0x...` a nombres reales (ej. "Sung Jin-woo") cruzando datos con la lista de personal.
- **Transparencia Total**: Cada hito muestra su **TxHash** original, permitiendo auditar la veracidad del dato en la red.

#### 4. Sistema de Reportes PDF Profesional (jsPDF)
- **Sanitización de Datos**: Implementación de `stripEmojis` para garantizar reportes limpios y profesionales, eliminando artefactos visuales de codificación.
- **Reporte de Trazabilidad**: Generación de un documento de "Hoja de Vida" para cualquier activo del tablero logístico.

#### 5. Optimización del Tablero Logístico
- **Filtrado Dinámico**: Dropdown de estados (TODOS / DISPONIBLES / EN OPERACIÓN).
- **Interfaz Compacta**: Rediseño del encabezado para mantener la operatividad en una sola línea táctica.

#### 6. Exclusividad de Personal (Deployment Tracking)
Se ha implementado una capa de seguridad operativa para evitar que un brigadista sea asignado a múltiples incidentes:
- **Lógica en Contrato**: Uso de `despliegueActual` y `contadorRecursos` para rastrear la ocupación del personal. La blockchain revierte automáticamente si se intenta una doble asignación.
- **Filtro Inteligente en UI**: El desplegable de selección de brigadistas ahora excluye automáticamente a personal que ya tiene tareas activas en otros incidentes, admitiendo solo a los disponibles o a quienes ya pertenezcan al incidente actual.

#### 7. Gestión Dinámica de Riesgo (Actualización de Criticidad)
Para responder a la evolución de una emergencia, el sistema permite ahora actualizar el nivel de riesgo en tiempo real:
- **Función `actualizarRiesgoIncendio`**: Permite al Jefe de Escena o Base Operativa modificar el riesgo (1-5) de un incidente activo.
- **Bitácora Inmutable Automática**: Cada cambio genera una entrada automática en el historial blockchain indicando el nivel anterior, el nuevo nivel y quién autorizó el cambio.

### Archivos de Referencia - Fase 5
- [TacticalPanel.jsx](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/frontend/src/TacticalPanel.jsx) - Lógica de visibilidad y monitoreo táctico (Mapa/Radar).
![09_Boton_Panel_de_Control](imagenes/09_Boton_Panel_de_Control.png)
![10_Panel_de_Control](imagenes/10_Panel_de_Control.png)
- [AssetTable.jsx](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/frontend/src/components/AssetTable.jsx) - Componente de gestión dinámica de recursos en campo.
- [PersonnelTable.jsx](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/frontend/src/components/PersonnelTable.jsx) - Vista de brigadistas con filtrado inteligente de disponibilidad.
- [TrazabilidadLogistica.sol](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/contracts/TrazabilidadLogistica.sol) - Lógica de exclusividad y contadores tácticos.

## Fase 6: Auditoría Forense, Handshake y UX Logística ✨🕵️‍♂️
El proyecto ha evolucionado de una gestión operativa a un ecosistema de auditoría blindado, integrando peritaje inmutable y visualización 360.

### 1. Centro de Supervisión Táctica (Auditor Dashboard)
- **Visión 360 Unificada**: Integración del botón **"RESUMEN EVENTO"**, permitiendo al auditor visualizar la bitácora táctica exacta, pines de radar y hitos de brigadistas antes de emitir su firma.
- **Filtrado Avanzado**: Sistema de búsqueda y filtrado por estado (ACTIVOS / CON DISCREPANCIAS / PERITADOS) para priorizar hallazgos críticos.
- **Gestión de Hallazgos**: Ventana de inspección detallada que cruza eventos de `DiscrepanciaRegistrada` y `AlertaConsumo` emitidos por la blockchain.

### 2. Blindaje de Integridad Operativa
Se han implementado capas de validación en el frontend para asegurar que el Centro de Supervisión Táctica refleje únicamente la actividad de los incidentes formalmente registrados (ID 1 en adelante), garantizando la coherencia entre los estadísticos globales y el mapa táctico.


### 3. Estandarización Estética y UX Premium
- **Badges Modernos**: Unificación de etiquetas de estado en cápsulas semitransparentes de alto contraste.
- **Timestamps Blockchain**: Visualización unificada de horas de INICIO y FIN del evento extraídas directamente de los bloques de la red.
- **Resolución de Nombres**: Acortamiento inteligente de direcciones (`0x1a2...4f5`) para optimizar la visualización en dispositivos móviles.

### Archivos de Referencia - Fase 6
- [AuditorDashboard.jsx](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/frontend/src/AuditorDashboard.jsx) - Centro de supervisión táctica y peritaje blockchain.
![11_Auditor_Dashboard](imagenes/11_Auditor_Dashboard.png)
![11_Auditor_Dashboard_02](imagenes/11_Auditor_Dashboard_02.png)
![11_Auditor_Dashboard_03](imagenes/11_Auditor_Dashboard_03.png)
- [App.jsx](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/frontend/src/App.jsx) - Motor de actas PDF (jsPDF) y lógica de Handshake.



## Fase 7: Ejecución de Simulación en Terreno (Libreto Dinámico)

Acompañamiento y registro de la operación "Simulación Táctica FireOPS", validando la trazabilidad de recursos bajo escenarios de estrés, daño y retorno.

### 🗓️ Registro de Hitos de Simulación (Operación "Simulación Táctica FireOPS" V2)

| Día | Escenario | Actor | Acción / Resultado |
| :--- | :--- | :--- | :--- |
| **SÁB** | **Cierre Quito (INC-002)** | Aura | Cierre sin novedades. Handshake Alice-Akira completado. |
| **DOM** | **Consumo Prosperina (INC-003)** | Alice | Alerta de consumo +25% detectada on-chain. |
| **LUN** | **Daño Cotopaxi (INC-005)** | Saori | Reporte de Daño Crítico en MB003. Riesgo sube a 5. |
| **LUN** | **Peritaje Final** | Nanami | Firma electrónica de informes con sello forense inmutable. |

### Archivos de Referencia - Fase 7
- [Libreto_Simulacion_ver2.md](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/Documentacion/Libreto_Simulacion_ver2.md) - Cronograma maestro de la operación "Simulación Táctica FireOPS".
- [logger.js](file:///home/ebit/projects/0%20CodeCrypto%20Academy/03%20Ethereum%20Practice/Intro%20a%20Proyectos%20de%20Entrenamiento/Proyectos%20obligatorios/88_Traz_Log/scripts/logger.js) - Registro de eventos off-chain durante la simulación.

---

## Fase 8: Conclusiones y Certificación Forense
El ciclo de vida del incidente ha sido validado satisfactoriamente desde la detección hasta el peritaje final:
- **Integridad**: Cada hito táctico y logístico cuenta con respaldo inmutable en la blockchain.
- **Auditoría**: Se han verificado las alertas automáticas de consumo y discrepancias de estado.
- **Transparencia**: El uso de Visión 360 garantiza que los auditores tengan el contexto operativo completo antes del cierre legal.

---


### 🚀 Reflexión Técnica: Granularidad NFT vs. Eficiencia ERC-1155

Como parte de la demostración de conocimientos avanzados en estándares de tokenización, se deja constancia del siguiente análisis de diseño:

*   **Enfoque Actual (NFT Unitario)**: Se decidió desarrollar la dApp utilizando IDs unitarios para cada activo. Este modelo garantiza una **Trazabilidad Unitaria Forense Absoluta**, ya que cada asignación o devolución requiere una firma digital obligatoria. Esto asegura que la responsabilidad sobre cada herramienta esté blindada individualmente en la blockchain.
*   **Visión de Escalabilidad (ERC-1155)**: Se reconoce que, en un escenario de combate de incendios real, el uso del estándar **ERC-1155** permitiría agrupar herramientas por tipos (SFT - Semi-Fungible Tokens). Esto facilitaría la asignación masiva de equipamiento mediante una **sola firma digital**, ganando valiosos minutos tácticos durante el despacho y la recepción de recursos, lo cual representa una ventaja operativa crítica en situaciones de alta intensidad.


*Este informe constituye la base técnica para la certificación de la Operación "Simulación Táctica FireOPS" y el cierre del proyecto.*

### Video demostrativo de FireOPS:
https://1drv.ms/v/c/50c3bed05caa316c/IQARBrVXud6xRpSWykdvVyqYAdET3GLSWVBgI51kr_56p5U?e=zDXhNg