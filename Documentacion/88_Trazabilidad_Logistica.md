# 🔥 FireOPS: Trazabilidad Logística Global de Eventos y Equipamiento en Incendios Forestales y Eventos de Quema Controlada
# Documento base para el diseño inicial de la arquitectura de la dApp

## 🎯 Objetivo

Esta es una Aplicación Descentralizada, diseñada para revolucionar la gestión logística y operativa en el combate de incendios, integrando la inmutabilidad de la tecnología Blockchain con la eficiencia de los Sistemas de Comando de Incidentes.

Desde la perspectiva organizacional, esta plataforma optimiza la respuesta ante emergencias al permitir un control dinámico y en tiempo real del ciclo de vida de los insumos (desde equipos grandes y costosos motobombas, pasando por equipos medianos como radios de comunicación, hasta equipos pequeños como los batefuegos), asegurando que cada recurso esté exactamente donde se necesita y bajo la custodia de personal calificado, reduciendo tiempos muertos y errores humanos en el despliegue de campo.

Desde la visión de transparencia e inmutabilidad, la plataforma actúa como un auditor digital insobornable; al registrar cada asignación, consumo y retorno de equipo en un registro distribuido, se elimina cualquier posibilidad de alteración de datos, combatiendo frontalmente la corrupción y el mal manejo de bienes y recursos. El resultado es una trazabilidad absoluta que no solo salva recursos, sino que fortalece la confianza institucional mediante una rendición de cuentas automatizada, transparente y auditable en todo momento.

## 📋 Definiciones Iniciales

### 1. 👥 Jerarquía de Actores (Roles)

Definir los roles es clave para asignar permisos (quién puede registrar qué). La siguiente es una propuesta de jerarquía con enfoque inicial en la operatividad que se tiene en Ecuador y puede crecer a una proyección global:

| Actor | Rol en la dApp | Ejemplo de Permisos |
| :--- | :--- | :--- |
| **Administrador Nacional** (Cuenta 0 Anvil) | `ADMIN_NACIONAL` | Despliega el contrato, registra Bases Operativas, Cambios de Roles. |
| **Bases Operativas** (Cuentas 1 y 2 Anvil) | `BASE_OPERATIVA` | Registra inventarios, reporta novedades, asigna Jefe de Escena, Gestión de personal. |
| **Jefe de Escena** (Cuentas 3 a 6 Anvil) | `JEFE_ESCENA` | Crea Eventos de Incendio, asigna recursos a las Brigadas, registra fases. |
| **Brigadista / Operador** (Cuentas 7 a 16 Anvil) | `OPERADOR` | Registra Uso/Pérdida de insumos, registra hitos de avance o daño. |
| **Verificador / Auditor** (Cuenta 17 y 18 Anvil) | `AUDITOR` | Solo consulta. Revisa cadena de eventos y rendición de cuentas. |
| **Público General** (Cuenta 19 Anvil) | `CONSULTOR` | Solo consulta. Verifica eventos y estado general de recursos. |

________________________________________

### 2. Arquitectura de Seguridad y Gobernanza

•	**Control de Acceso Granular:** Se implementará el estándar **AccessControl de OpenZeppelin**. Esto permite trabajar con identificadores únicos (bytes32) que representan cada rol, haciendo que el sistema sea **Dinámico**. Si se necesita dar de baja a un Jefe de Escena o añadir un nuevo Auditor, el Administrador General puede hacerlo mediante una transacción, sin necesidad de modificar o volver a desplegar el código del contrato. Se desplegará Anvil indicándole que use 20 cuentas (opción –accounts 20) para poder tener un abanico más amplio de direcciones para la interacción.

#### **Tabla2: Comparación de Control de Acceso**

| Característica | Con `if (msg.sender == ...)` | Con `AccessControl` |
| :--- | :--- | :--- |
| **Escalabilidad** | Limitada a una o pocas direcciones fijas. | Permite cientos de direcciones por rol. |
| **Seguridad** | Riesgo de "Hardcoding" y errores manuales. | Biblioteca auditada por la industria (OpenZeppelin). |
| **Gobernanza** | Estática (requiere actualizar contrato). | Dinámica (gestión de permisos en tiempo real). |
| **Costo Gas** | Variable según la complejidad del `if`. | Optimizado mediante Hashing (keccak256). |


•	**Pausa de Emergencia (Circuit Breaker):** Se implementará el estándar **Pausable**. Este mecanismo permitirá al **ADMIN_GENERAL** detener temporalmente las funciones de escritura en el Smart Contract ante la detección de anomalías o fallos de infraestructura, asegurando que la integridad de los datos no se vea comprometida durante una incidencia.
•	**Prevención de Reentrada:** Se aplicará el modificador **nonReentrant** en funciones críticas de actualización de inventario y cierre de eventos. Con esto se evitarán ataques de llamadas recursivas que pudiesen intentar duplicar registros de devolución o manipular estados de insumos de forma concurrente.
•	**Trazabilidad de Gobernanza (Audit Logs):** Se definirá una arquitectura de eventos indexados que registrará cada cambio en la estructura de permisos. Mediante la emisión de eventos como **RoleGranted** y **RoleRevoked**, se facilitará una auditoría forense inmutable sobre quién otorgó o retiró facultades dentro de la plataforma.

### 3. Trazabilidad del Ciclo del Evento

El ciclo de un incendio se divide en tres fases principales que registrarán eventos inmutables en la blockchain.

#### 3.1. Fase Previa - Inventario, Mantenimiento y Medios disponibles (personal y equipamiento)

En esta fase, el enfoque es la **gestión de activos**. Se registra la vida útil y el mantenimiento de los insumos críticos.

•	**Registro de Insumo Único (NFT/Token ID):** Cada ítem se registra con un valor único como identificador y su respectivo mantenimiento
    - Ejemplo de registro: [evento **ASSET_REGISTRATION**] La base 'Quito Central' da de alta: "Camión Cisterna Hino. **ID: CC-001**. Capacidad: 2000 litros. Año: 2024. Estado Inicial: Operativo"., La base 'Guayaquil' da de alta: "Motobomba Portátil. **ID: MB-002**. Presión: 150 PSI. Fabricante: Waterax. Estado Inicial: Operativo".


•	**Eventos de Mantenimiento:** Se registra la fecha y el resultado del último evento, como por ejemplo su última revisión o mantenimiento.

- Ejemplo de Evento: [evento **MAINTENANCE_LOG**] La base 'Quito Central' registra: "Reemplazo de batería de Radio Motorola **ID-RD003**. Fecha: 2025-12-01. Operador: Pedro Álava."
- Ejemplo de Insumo: [evento **INVENTORY_STATUS**] La base 'Guayaquil' registra: "Stock de mangueras (3 pulgadas) **ID-MG002** actualizado a 50 unidades. Última reposición: 2025-11-20."

•	**Registro de personal disponible:** Para saber cuántas personas se tendrían disponibles para cualquier evento
- Ejemplo de registro de Personal: 
    - **Contexto:** Inicio de guardia en la Estación de Bomberos. El personal pide ser registrado en la dApp con su Wallet institucional para quedar activo en el pool de despacho.

        - **Datos Registrados en Blockchain:**

            * ID Persona: Wallet_0x123...abc (Vinculada al ID de empleado).

            * Rol Táctico: Jefe de Cuadrilla / Motobombista / Paramédico.

            * Estado: DISPONIBLE (Green Status).

            * Certificaciones Activas: Curso CPIF (Combatiente de Incendios Forestales) - Vigente hasta 2026.

        - Acción de la dApp: Al momento de un despacho, el sistema muestra todos los brigadistas que estén en estado 'Disponible'.

        - Resultado: El Comandante de Incidentes ve en su Dashboard una lista de personal real, no teórica, evitando enviar a alguien que ya está en otra misión o que no tiene el reentrenamiento al día.

#### 3.2.	🚒 Fase Durante (Combate y Asignación)

Aquí se registra la cadena de custodia de los insumos.

Pasos Clave del Evento de Incendio:

•	Creación del Evento (rol **JEFE_ESCENA**): Se registra el inicio del incidente: [**ID-INC002**], Coordenadas -0.1807, -78.4678, Nivel de Riesgo 4, Fecha y Hora de inicio.

•	Asignación de Recursos (rol **JEFE_ESCENA**): Se vinculan los insumos del inventario al evento y a la Brigada responsable.
    o	Ejemplo: [evento ASSIGNMENT_LOG] Jefe de Escena **ID-JF05** asigna: "Camión Cisterna **ID-CC007** + 5 radios **ID-RF00x** a Brigada."

•	Registro de Uso y Consumo (rol **OPERADOR**): Los brigadistas registran el uso y el estado final de los insumos.
    o	Ejemplo: [evento CONSUMPTION_LOG] Operador **ID-BG04** registra: "Consumo de 500 litros de líquido retardante del Cisterna **ID-CC007**. Hito: Línea de contención establecida al 50%."

#### 3.3.	✅ Fase Post (Verificación y Rendición de Cuentas)

En esta fase se cierra el ciclo del incendio y se audita el estado final de los recursos.

•	Cierre del Evento (rol **JEFE_ESCENA**): Se registra la hora de control/extinción y el resumen de daños.

•	Auditoría de Insumos (rol **BASE_OPERATIVA**): Se verifica la devolución de los insumos asignados y su estado.
    o	Ejemplo: [evento AUDIT_LOG] Base Operativa verifica: "Radio **ID-RF005** devuelto en estado 'Daño Menor'. Se requiere reemplazo de antena. Se va a Taller por mantenimiento/reposición."

•	Reporte de Transparencia (rol **AUDITOR**): Se genera un resumen consultable por el público: "Incendio Forestal [**ID-INC001**]: Recursos asignados, Consumo total de agua/retardante,"
________________________________________

### 4.	💾 Estructuras Clave de Solidity (Smart Contract)

El contrato utiliza una arquitectura de **Enums**, **Mappings** y **Structs** para garantizar la integridad y eficiencia de los datos.

#### 4.1. Enumeraciones (Estados de Trazabilidad)

```solidity
enum EstadoInsumo {     // Verificación Física (Base Operativa)
    Disponible,
    EnUso,
    Taller,
    Perdido,
    EnRetorno
}

enum EstadoReportado {  // Declaración Jurada (Brigadista en Campo)
    Operativo,
    DanoMenor,
    DanoCritico,
    Perdido
}
```

#### 4.2. Representación del Personal (Fase 1)

```solidity
struct Personal {
    address billetera;      // Cuenta de Anvil (8-15 para Operadores)
    string nombre;
    string especialidad;    // Maquinista, Radio, Conductor, etc.
    bool estaActivo;        // Control administrativo de baja/alta
}
```

#### 4.3. Gestión de Activos Físicos (Fase 1, 2 y 3)

```solidity
struct Insumo {
    bytes32 codigoInventario;   // ID único optimizado (ej: CC-001)
    string descripcion;
    address basePropietaria;    // Base que dio el alta (Cuentas 1-2)
    address custodioActual;     // address(0) si está en base, o la del Operador
    EstadoInsumo estado;        // Verificación Física de la Base
    EstadoReportado estadoReportadoF2; // Declaración del Brigadista
    uint256 ultimoMantenimiento;
    uint256 consumoNominal;     // Consumo esperado por hora
    uint256 inicioUso;          // Timestamp de asignación para auditoría
}
```

#### 4.4. Control del Incidente (Fase 2 y 3)

```solidity
struct EventoIncendio {
    uint256 eventoID;
    address jefeDeEscena;       // Cuenta de Anvil (3-6)
    uint256 timestampInicio;
    uint256 timestampFin;
    string coordenadas;
    uint256 riesgo;             // Escala 1-5
    bool activo;
    bytes32[] recursosAsignados; // Seguimiento para cierre automático
}
```

#### 4.5. Diario de Operaciones (Logs de Auditoría)

```solidity
struct LogOperativo {
    uint256 eventoID;
    bytes32 codigoInsumo;
    address operador;           // Quién usó/reportó el equipo
    uint256 timestamp;
    string detalles;            // "Línea de contención al 50%", "Daño en manguera"
    bool esDiscrepancia;        // Marcador automático para el Auditor
}
```

#### **Tabla3: Almacenamiento y Mapeos**

| Mapeo / Estructura | Propósito Técnico |
| :--- | :--- |
| `mapping(bytes32 => Insumo) public inventario` | Búsqueda instantánea de herramientas por su ID industrial. |
| `mapping(address => Personal) public brigadistas` | Registro de identidades Web3 para el personal activo en campo. |
| `mapping(uint256 => EventoIncendio) public incendios` | Bitácora de todos los incendios registrados (ACTIVOS/CERRADOS). |
| `mapping(uint256 => LogOperativo[]) public bitacoraEvento` | Historial inmutable de hitos técnicos vinculado a cada incidente. |
| `mapping(address => bool) public basesAutorizadas` | Lista blanca de administradores autorizados para carga logística inicial. |
| `address[] public listaPersonal` | Arreglo iterable para que el Frontend pueda listar a todo el personal. |
| `mapping(bytes32 => AuditoriaPendiente) public auditoriasPendientes` | **Fase 3**: Gestiona el Handshake y la verificación física del equipo. |
| `mapping(address => uint256) public despliegueActual` | **Seguridad**: Evita la doble asignación de brigadistas en campo. |
| `mapping(address => uint256) public contadorRecursos` | **Control**: Seguimiento numérico de activos bajo custodia por usuario. |

### 5.	 Diagrama de Bloques dApp Fuego Zero

![Diagrama de Bloques dApp Fuego Zero](imagenes/01_Diag_bloques_dApp.png)
 
### 6.	🏛️ Las Fases del Bloque Central:

#### 6.1.	Fase 1: Previa (Inventario y Mantenimiento)

Se enfoca en la gestión de activos y la preparación, garantizando que todos los recursos que potencialmente se usarán en un incendio forestal estén documentados, localizados y en estado operativo verificado.

Establecer la **cadena de origen** de cada activo crítico, garantizando que su estado, ubicación y historial de servicio sean **inmutables** antes de su asignación a un evento de emergencia.

El Actor Principal: **BASE_OPERATIVA.** Este rol, típicamente asignado al jefe de logística o al comandante de la estación de bomberos, tiene el poder de escribir datos iniciales y de mantenimiento en el Smart Contract (SC). Es la persona que físicamente tiene la custodia y responsabilidad del equipo, y es la única con permisos para Registrar Insumos y Registrar Mantenimiento del Equipamiento que lo amerita.

**Procesos Centrales**: La Fase 1 se compone de dos procesos de escritura de datos esenciales: la creación del activo y su seguimiento periódico.

#### 6.1.1. Proceso de Creación: Registro de Nuevo Insumo

Este proceso ocurre una sola vez en la vida de un activo y le da un ID único en la Blockchain.

#### **Tabla 4: Proceso de Creación: Registro de Nuevo Insumo**

| Elemento | Descripción | Función SC (Solidity) | Impacto en SC |
| :--- | :--- | :--- | :--- |
| **Insumo Único** | Registro individual de equipos con trazabilidad (Ej: Motobomba, Radio). | `registrarInsumo(...)` | Crea un struct `Insumo` con ID (bytes32), estado inicial y consumo nominal. |
| **Carga Masiva** | Registro eficiente de múltiples activos en una sola transacción (CSV). | `registrarInsumosBatch(...)` | Itera y crea múltiples registros optimizando el consumo de gas en el despliegue inicial. |
| **Trazabilidad de Vida** | Registro inmutable de la base propietaria y fecha de alta en el sistema. | `_registrarInsumo(...)` | Establece el `tx.origin` como propietario y fija el timestamp de `ultimoMantenimiento`. |



**Ejemplo de Registro**: La *BASE_OPERATIVA* firma una transacción para registrar un "Kit de Linterna Táctica **ID-LT005**" en estado "Disponible".

#### 6.1.2. Proceso de Seguimiento de activos

Este proceso ocurre una vez finalizado el incidente y permite actualizar el estado del activo y marcar como Taller a aquellos que no están aptos para ser desplegados nuevamente en otros incidentes.

#### **Tabla 5: Seguimiento y Sincronización de Estado Post-Evento**

| Elemento | Descripción | Función SC (Solidity) | Impacto en SC |
| :--- | :--- | :--- | :--- |
| **Sello de Mantenimiento** | Actualización automática de la hoja de vida del equipo al finalizar su uso. | `firmarDeslinde(...)` | Actualiza de forma inmutable el campo `ultimoMantenimiento` con el sello de tiempo actual. |
| **Bloqueo Operativo** | Restricción de salida para equipos reportados con daños o en taller. | `require(estado == Disponible)` | Impide que el Jefe de Escena asigne equipos que no han pasado por una revisión física conforme. |
| **Timestamp de Auditoría** | Registro histórico del momento exacto del último chequeo físico en base. | `block.timestamp` | Fija la fecha de la última auditoría de integridad realizada por la Base Operativa. |

> **⚠️ Nota de Integridad Logística y Trazabilidad de Daños:**
> El diseño actual del sistema prioriza la **seguridad operativa** y la **inmutabilidad de la evidencia**. Al quedar un equipo marcado como *"Taller"* durante el proceso de devolución post-incendio (`firmarDeslinde`), el contrato bloquea automáticamente su re-despliegue. Esto garantiza una trazabilidad forense absoluta: se sabe con exactitud en qué incidente y bajo qué custodio se produjo la avería, impidiendo que una herramienta defectuosa salga a una nueva misión por error humano.
>
> **Recomendación de Escalabilidad (Roadmap):** 
> Como mejora futura, se recomienda la adopción del estándar **ERC-1155** para la gestión de metadatos dinámicos. Esto permitiría implementar una función de *"Reparación Certificada"* que, tras una firma digital del departamento técnico, actualice el estado del activo de *"Taller"* a *"Disponible"*, cerrando así el ciclo de vida del recurso sin comprometer la cadena de custodia previa.

**Ejemplo de Sincronización Post-Evento**: Al finalizar el incidente *"Prosperina"*, la **BASE_OPERATIVA** realiza la recepción física de la Motobomba **ID-MB001**. Al detectar un fallo técnico, el operador la marca con estado *"Taller"* mediante la función `registrarAuditoria`. Al completarse el handshake (`firmarDeslinde`), el Smart Contract graba el último sello de tiempo operativo y bloquea el activo para re-desliegues nuevos. Esto deja una evidencia digital absoluta: el equipo dejó de ser seguro precisamente tras su servicio en el incidente *"Prosperina"*, justificando técnicamente su baja o reposición.


#### 6.1.3. Proceso de Creación: Registro y Acreditación de Personal

Este proceso establece la identidad digital y operativa de cada interviniente. El sistema prioriza la **verificación de disponibilidad en tiempo real** y la **exclusividad de maniobra**, asegurando mediante el Smart Contract que un mismo brigadista no pueda ser asignado a dos eventos simultáneos, garantizando así la integridad de la cadena de mando y la seguridad del personal en campo.

#### **Tabla 7: Registro y Acreditación de Disponibilidad de Personal**

| Elemento | Descripción | Función SC (Solidity) | Impacto en SC |
| :--- | :--- | :--- | :--- |
| **Identidad Digital** | Vinculación de billetera con datos operativos del brigadista. | `registrarPersonal(...)` | Crea el registro en `brigadistas` y asigna el rol inicial (RBAC). |
| **Gobernanza de Roles** | Gestión dinámica de permisos (Jefe de Escena, Operador, etc.). | `grantRole(...)` / `revokeRole(...)` | Modifica los permisos de acceso en tiempo real sin redeplegar el código. |
| **Control de Despliegue** | Evita que un brigadista sea asignado a dos incendios a la vez. | `despliegueActual[...]` | Bloqueo lógico: garantiza que el personal esté asignado a un único `eventoID`. |
| **Custodia de Activos** | Seguimiento numérico de equipos bajo responsabilidad del usuario. | `contadorRecursos[...]` | Auditoría: permite saber cuántos activos tiene una persona antes de permitir su liberación. |


#### 6.1.4. Conexión Lógica con Fases Posteriores

La calidad de la data en la Fase 1 es lo que permite la rendición de cuentas en las fases 2 y 3.

•	**Conexión con la Fase 2 (Durante)**: Un *JEFE_ESCENA* solo puede `asignarInsumo(...)` si ese activo existe en el inventario y su estado es estrictamente **`Disponible`**. Si el equipo está en mantenimiento o bajo otra custodia, el Smart Contract bloquea la transacción automáticamente.

•	**Conexión con la Fase 3 (Post)**: El *AUDITOR* cuenta con visibilidad total sobre la integridad de la misión, permitiéndole contrastar los parámetros técnicos de la Fase 1 con los hitos operativos de la Fase 2 y el peritaje físico de la Fase 3. El **Smart Contract**, de forma autónoma, genera alertas inmutables si detecta discrepancias, proporcionando evidencias insobornables que el Auditor utiliza para validar la rendición de cuentas final.


#### 6.1.5. 🧱 Diagrama de Bloques: Flujo Operativo de la Fase 1
![Diagrama de Bloques Fase 1](imagenes/02_Diag_Flujo_Fase1.png)
 
Esta fase, asegura la integridad de los datos desde el origen. Si tienes este inventario bien trazado en la Blockchain, cualquier uso o pérdida posterior será irrefutablemente documentado.

#### 6.2. 🚒 Fase 2: Durante (Asignación y Combate)

**🎯 Objetivo Principal**

Registrar de manera inmutable qué es lo que se está usando, quién lo tiene y cuál es el avance del combate, vinculando los recursos de la Fase 1 con un incidente específico.

#### 6.2.1. Actores

•	**Jefe de Escena** (*JEFE_ESCENA*): Es el "Director de Orquesta". Abre el evento, solicita recursos y los asigna. Su firma en la dApp valida que el recurso entró a la zona caliente.
•	**Operador/Brigadista** (*OPERADOR*): Es quien está en la línea de fuego. Reporta si una batería se agotó, si una herramienta se rompió o si el consumo de agua fue de "X" litros.

#### 6.2.2. Procesos Centrales y su Impacto en la Blockchain

La Fase 2 transforma el estado estático del inventario en un flujo dinámico de eventos. Se compone de dos procesos críticos: la gestión del evento y la trazabilidad de la custodia.

#### 6.2.2.1. Proceso de Gestión del Incidente: Creación y Cierre de Evento

Este proceso permite al **Jefe de Escena** activar la logística de emergencia. Sin un evento abierto, no se pueden asignar recursos, lo que evita el uso no autorizado de activos.

#### **Tabla 8: Proceso de Gestión del Incidente: Creación y Cierre de Evento**

| Elemento | Descripción | Función SC (Solidity) | Impacto en SC |
| :--- | :--- | :--- | :--- |
| **Apertura de Incidente** | Creación de un nuevo EventoID con datos de ubicación y riesgo. | `abrirEventoIncendio(...)` | Genera el ancla lógica para toda la trazabilidad de la Fase 2. |
| **Validación de Actividad** | Seguridad que impide registrar datos en eventos fuera de servicio. | `require(evento.activo)` | Bloquea funciones de asignación y bitácora una vez terminada la misión. |
| **Cierre de Incidente** | Finalización táctica y bloqueo de registros operativos. | `cerrarIncidente(eventoID)` | Cambia el evento a Inactivo (`false`) y marca el timestamp de cierre. |
| **Estado "En Retorno"** | Fase de custodia de vuelta a base (Seguridad Logística). | `EstadoInsumo.EnRetorno` | Disparador automático: todos los recursos asignados cambian de 'En Uso' a 'En Retorno'. |
| **Inicio de Handshake** | Transición obligatoria hacia la auditoría final de Fase 3. | `iniciarRetorno(...)` | Permite al brigadista desvincularse tempranamente si el equipo requiere taller. |


**Ejemplo de Inicio de Incidente:** El *JEFE_ESCENA* en el sector "Pasochoa" registra: Evento **ID-101**, Coordenadas: -0.45, -78.49, Riesgo: Nivel 4 (Alto).

**Ejemplo de cierre de Incidente:**
•	**Acción:** El *JEFE_ESCENA* cierra el Evento **ID-101**.
•	**Efecto Inmediato:** La Motobomba **ID-MB001** pasa automáticamente de estado *“En Uso”* a estado *“En Retorno”*, quedando el evento inactivo.
•	**Seguridad Logística (Detección de Desvíos):** Cualquier hito o consumo reportado después del cierre táctico quedará grabado con un *timestamp* posterior al `timestampFin` del incidente. Esto permite al **Auditor** identificar intentos de justificar de manera irregular el consumo de insumos durante el trayecto de vuelta.
•	**Liquidación de Custodia:** La dApp cierra formalmente el procedimiento en la Base Operativa mediante la ejecución del **Handshake de Fase 3**. Este acto técnico es el único que habilita la liberación de la responsabilidad del brigadista y el re-ingreso oficial del equipo al pool de **`Disponibilidad`**.

#### 6.2.2.2. Proceso de Trazabilidad: Asignación y Reporte de Uso

Este es el proceso más dinámico, donde los insumos de la Fase 1 se vinculan a personas y acciones.

#### **Tabla 9: Proceso de Trazabilidad: Asignación y Reporte de Uso**

| Elemento | Descripción | Función SC (Solidity) | Impacto en SC |
| :--- | :--- | :--- | :--- |
| **Asignación de Activo** | Entrega oficial de un equipo a un brigadista para la misión. | `asignarInsumo(...)` | Cambia el estado a `EnUso` y establece el `custodioActual` de forma inmutable. |
| **Bitácora Táctica** | Reporte oficial del Jefe de Escena sobre el avance del fuego. | `registrarBitacoraTactica(...)` | Crea una línea de tiempo táctica vinculada institucionalmente al EventoID. |
| **Reporte de Hito** | Registro de novedades y estado preventivo del equipo en campo. | `registrarHito(...)` | Permite al brigadista alertar sobre el estado físico del activo durante el combate. |
| **Cierre de Incidente** | Finalización del evento y bloqueo de asignaciones. | `cerrarIncidente(...)` | Dispara el bloqueo lógico de la Fase 2 y activa el estado de retorno de los activos. |
| **Iniciación de Entrega** | Solicitud formal del brigadista para entregar su custodia. | `iniciarRetorno(...)` | Paso previo obligatorio para que la Base Operativa pueda auditar el activo en Fase 3. |

**Ejemplo 1: Asignación de Activo y Datos de Consumo**

*   **Contexto**: Se despliega la Motobomba **ID-MB001** al Incendio **ID-INC101**.
*   **Acción**: El *JEFE_ESCENA* ejecuta `asignarInsumo(ID-INC101, "ID-MB001", 0xBrigadista9)`. La dApp ya cuenta con el `consumoNominal` de **20 litros/hora** registrado en Fase 1.
*   **Resultado**: El activo queda bloqueado para otros eventos y marcado como *"En Uso"*. La custodia legal pasa íntegramente al brigadista.

**Ejemplo 2: Filtro de Integridad de Protocolo (Fail-Safe)**

*   **Contexto**: Un intento de despliegue forzado (vía script o terminal) de la Motobomba **ID-MB002** que está marcada como **"Taller"**.
*   **Acción**: El sistema (o un atacante) intenta invocar `asignarInsumo(...)` saltándose las restricciones de la interfaz web.
*   **Resultado**: **TRANSACCIÓN REVERTIDA POR PROTOCOLO**. El Smart Contract actúa como auditor final de seguridad, garantizando que ninguna falla en el frontend o intento de manipulación externa comprometa la integridad física de la misión. El error devuelto es: `REVERT: Insumo no disponible`.


**Ejemplo 3: Auditoría de "Gasto Fantasma" Post-Cierre**

*   **Contexto**: El incendio se declara controlado y el Jefe de Escena ejecuta `cerrarIncidente(ID-INC101)`.
*   **Intento de Fraude**: Un operador intenta registrar un hito de consumo de **50 litros** de agua extra a las 16:00, pero el evento se cerró oficialmente a las 15:30.
*   **Resultado Forense**: El registro queda grabado con un *timestamp* posterior al cierre. El **Auditor** identifica esta discrepancia temporal en el Dashboard, marcando el consumo como "No Autorizado" por ocurrir fuera del tiempo táctico de misión.

**Ejemplo 4: Liquidación Final (Handshake de Fase 3)**

*   **Contexto**: El equipo llega a la Base Operativa para su entrega física y digital.
*   **Acción**: La Base registra el peritaje (`registrarAuditoria`) y el Brigadista firma digitalmente su conformidad (`firmarDeslinde`).
*   **Resultado**: El activo se libera de la custodia del brigadista, el contador de recursos del personal se limpia y la Motobomba vuelve a estar **`Disponible`** para el próximo incidente.

### **6.2.3. Componentes Críticos del Flujo**

Para garantizar que la trazabilidad sea absoluta y "a prueba de errores humanos", el flujo se apoya en los siguientes pilares lógicos:

*   **El Evento (ID Único)**: No se permite la salida de ningún recurso si no existe un `EventoID` activo en la Blockchain. Esto elimina el uso discrecional de bienes y justifica cada movimiento logístico bajo un incidente de incendio real.
*   **Gestión Dinámica de la Custodia**: La responsabilidad legal se transfiere en tiempo real. Al ejecutar `asignarInsumo`, el estado cambia a *"En Uso"*, vinculando la billetera digital del operador al activo. En caso de pérdida, la Blockchain señala al responsable sin ambigüedades.
*   **Seguridad por Timestamps**: La inmutabilidad de la hora de red (`block.timestamp`) impide la manipulación de reportes. El Auditor puede contrastar el tiempo de combate oficial contra los reportes de consumo, detectando desviaciones en el uso de insumos (litros reportados vs tiempo de operación).
*   **Filtros de Integridad (Fail-Safe)**: El Smart Contract actúa como auditor automático al integrar la validación `require(estado == Disponible)`. Si un equipo fue marcado como **"Taller"** en la Fase 1, se bloquea su salida, protegiendo la integridad de los brigadistas en el teatro de operaciones.
*   **Inmutabilidad de Hitos y Consumos**: Cada reporte de uso o hito de control del fuego queda grabado con una marca de tiempo (Timestamp) inalterable. Esto genera una línea de tiempo técnica que sirve como evidencia legal y operativa para las auditorías de la Fase 3.
________________________________________

#### 6.2.4.🧱 Diagrama de Bloques: Flujo Operativo de la Fase 2

Aquí visualizamos las decisiones que toma el Jefe de Escena, la Base Operativa y el Operador/Brigadista:

![Diagrama de Bloques Fase 2](imagenes/03_Diag_Flujo_Fase2.png)

### **6.2.5. Centro de Mando Táctico y Dashboard de Auditoría**

El sistema integra un **Panel de Control en tiempo real** que permite al *Auditor* y a los cuerpos de mando visualizar dinámicamente la evolución de todos los incidentes activos. 

*   **Fuentes de Datos Inmutables**: El panel consume directamente los eventos `HitoRegistrado`, `AlertaConsumo` y `DiscrepanciaRegistrada` emitidos por la Blockchain, eliminando cualquier posibilidad de manipulación visual de los datos.
*   **Integridad Forense**: El Dashboard actúa como un espejo exacto del estado del Smart Contract, permitiendo rastrear la ubicación, los hitos operativos y el consumo de recursos (en **litros**) segundo a segundo.
*   **Generación de Evidencias**: Desde este centro de mando, el Auditor puede descargar reportes certificados vinculados a los hashes de las transacciones, garantizando una rendición de cuentas absoluta.


#### 6.3. 🏗️ Fase 3: Post (Auditoría, Recepción y Rendición de Cuentas)


En esta fase, se verifica el estado final de los activos, mostrando la capacidad de la Blockchain para realizar auditorías de estados previos.

**🎯 Objetivo Principal**

Finalizar formalmente la cadena de custodia mediante el **Handshake de Fase 3**, liberando la responsabilidad legal del brigadista y reintegrando los equipos al pool de disponibilidad para futuras misiones. Asimismo, se genera un reporte de transparencia inmutable que consolida los reportes de uso frente al estado físico final, garantizando una rendición de cuentas absoluta sobre la integridad de los recursos del combate.


#### 6.3.1. Actor Principal: *AUDITOR / BASE_OPERATIVA*

En esta fase, la **Base Operativa** recupera su rol protagónico para recibir el equipo, pero entra en juego el **Auditor** para validar que lo que salió coincida con lo que regresó.

#### 6.3.2. Procesos Centrales y su Impacto en la Blockchain (Fase 3)

La Fase 3 evalua el estado del inventario posterior a un evento. Se compone de dos procesos críticos: la recepción y reintegro, y la rendición de cuentas.

#### 6.3.2.1. Proceso de Retorno y Cierre Operativo

Es el proceso inverso a la asignación. El equipo deja de estar vinculado al evento y regresa a la base.

En la siguiente tabla se describe cómo el activo vuelve a estar "Disponible" y cómo se detectan las fallas de último momento.

#### **Tabla 10: Auditoría Técnica y Cierre de Custodia (Handshake de Fase 3)**

| Elemento | Descripción | Función SC (Solidity) | Impacto en SC |
| :--- | :--- | :--- | :--- |
| **Auditoría de Recepción** | Ingreso del estado físico y consumo real de litros verificado al llegar a base. | `registrarAuditoria(...)` | Graba la "versión de la base" para ser contrastada con el reporte del brigadista. |
| **Handshake de Deslinde** | Firma digital de conformidad del brigadista tras la entrega. | `firmarDeslinde(...)` | **Cierre Crítico**: Cruza F1 vs F2 vs F3 y dispara la liberación o el reporte de daños. |
| **Alerta de Consumo** | Detección automática de exceso de gasto vs capacidad nominal. | `emit AlertaConsumo(...)` | Genera una evidencia inmutable si el equipo gastó más litros de lo técnicamente posible. |
| **Sello de Discrepancia** | Alerta si el estado reportado en campo difiere del estado recibido. | `emit DiscrepanciaRegistrada(...)` | Marca el activo con una nota de auditoría para revisión técnica inmediata. |
| **Liberación Logística** | Reintegración automática al inventario de Fase 1. | `EstadoInsumo.Disponible` | Ocurre solo si el Handshake es exitoso y el equipo está operativo. |


**Ejemplo 1: Retorno Exitoso y Reintegro (Flujo Ideal)**

*   **Contexto**: El Incendio "Laderas del Pichincha **ID-INC003**" ha sido controlado. El Brigadista retorna a la base con la Radio **ID-RF010**.
*   **Acción en la dApp**: La Base registra el peritaje exitoso (`registrarAuditoria`) y el Brigadista ejecuta el **Handshake de Deslinde** (`firmarDeslinde`).
*   **Resultado Final**:
    *   El contrato verifica la concordancia de estados F1 vs F2 vs F3.
    *   Se extingue la responsabilidad legal del brigadista (`custodioActual = address(0)`).
    *   El activo vuelve automáticamente al estado **`Disponible`**, listo para el siguiente despacho.

**Ejemplo 2: Detección de Discrepancia y Bloqueo (Flujo de Control)**

*   **Contexto**: Durante el combate, el brigadista golpeó el chasis de la Motobomba **ID-MB005**, pero no lo reportó en sus hitos de campo (F2).
*   **Acción en la dApp**: Al recibir el equipo, la Base registra técnicamente el daño como **"Taller"** vía `registrarAuditoria`. El brigadista firma el deslinde.
*   **Resultado Final**:
    *   El contrato detecta automáticamente que F2 (Operativo) != F3 (Taller) y emite el evento **`DiscrepanciaRegistrada`**.
    *   Se genera evidencia inmutable de negligencia u omisión en el reporte de daños del operador.
    *   El activo queda bloqueado en estado **`Taller`**, desapareciendo de la lista de asignables en la Fase 2.

**Ejemplo 3: Auditoría de Consumo por Desempeño**

*   **Contexto**: Se audita el consumo de combustible de la Motobomba **ID-MB001** tras 5 horas de combate (Consumo nominal: 10 L/h).
*   **Acción en la dApp**: La Base registra un consumo real verificado de **80 litros** mediante `registrarAuditoria`.
*   **Resultado Final**:
    *   El contrato calcula el consumo esperado (5h * 10L/h = 50L).
    *   Al detectar que 80L > 50L (Exceso del 160%), el sistema dispara automáticamente la **`AlertaConsumo`**.
    *   El **Auditor** recibe una alerta roja de "Desviación Crítica de Consumo", permitiéndole iniciar un peritaje forense sobre el uso irregular del recurso.


#### 6.3.2.2. Proceso de Rendición de Cuentas (Transparencia)

Es la consolidación de toda la "huella digital" del evento y todos los parámetros que se utilizarán para la rendición de cuentas.

#### **Tabla 11: Proceso de Rendición de Cuentas (Fuentes de Verdad de la Blockchain)**

| Elemento | Descripción | Mecanismo SC (Solidity) | Valor para Auditoría |
| :--- | :--- | :--- | :--- |
| **Registro de Incidente** | Consulta de metadata: Jefe, ubicación y tiempos tácticos. | Mapeo `incendios(id)` | Prueba legal de la existencia y duración del evento. |
| **Bitácora de Campo** | Acceso a todos los hitos y reportes técnicos del personal. | Mapeo `bitacoraEvento(id)` | Reconstrucción forense segundo a segundo de lo ocurrido en escena. |
| **Evidencia de Alertas** | Listado inmutable de abusos de consumo o discrepancias. | `Events (AlertaConsumo)` | Señalamiento técnico inalterable de anomalías logísticas. |
| **Estado de Activo** | Verificación de la vida útil y mantenimientos tras la misión. | Mapeo `inventario(codigo)` | Certificación del estado de salud del equipo para el próximo despacho. |
| **Hash de Transacción** | Sello digital que vincula cada acción con un responsable. | `tx.hash (Nativo)` | El "Sello de Auditoría" definitivo que garantiza la inalterabilidad. |


**Ejemplo 1: Auditoría de Transparencia de Misión**

*   **Contexto**: Un ente de control gubernamental solicita un informe detallado sobre el uso de recursos en el "Incendio Sector Norte" (**ID-INC101**).
*   **Acción del Auditor**: Filtra en el Dashboard todos los eventos y bitácoras vinculados institucionalmente a ese ID de evento único.
*   **Resultado de Transparencia**: El sistema despliega el **Hash de transacción** de cada hito táctico. Si alguien intentara alterar un reporte de consumo en una base de datos tradicional, el Hash original grabado en la Blockchain revelaría la manipulación de forma inmediata, garantizando una rendición de cuentas insobornable.

**Ejemplo 2: Hoja de Vida Digital del Activo (Peritaje y Reposición)**

*   **Contexto**: Se planea renovar un lote de equipos y se necesita saber si su desgaste justifica la reposición o si hubo mal uso por parte del personal operativo.
*   **Acción**: El Auditor consulta el historial operativo de un activo (ej. **ID-MB002**) a través del mapeo público de la `bitacoraEvento`.
*   **Resultado de Transparencia**: Se despliega toda la "vida técnica" del equipo: cuántos incendios atendió, quiénes fueron sus custodios legales y cuántas veces el contrato emitió el evento **`DiscrepanciaRegistrada`** por daños no reportados. Esto permite una toma de decisiones estratégica basada en evidencia, eliminando el favoritismo o las compras innecesarias.

**Ejemplo 3: Diagnóstico de Causa Raíz (Detección de Anomalías de Consumo)**

*   **Contexto**: Liquidación del "Incendio Sector Sur". El Camión **ID-CC004** reportó un consumo real verificado de **450 litros** tras 3 horas de operación en la Blockchain.
*   **Parámetro Base (Fase 1)**: El equipo tiene registrado un **Consumo Nominal Máximo** de 60 litros/hora (Total teórico esperado: 180 litros).
*   **Resultado del Informe Final**: Al detectar un exceso masivo (250% sobre lo nominal), el sistema dispara automáticamente la **`AlertaConsumo`**. El Auditor redacta un informe exigiendo una inspección dual: administrativa (para descartar malversación de insumos) y peritaje técnico (para identificar averías mecánicas no detectadas durante el hito de campo).


#### 6.3.3. 🧱 Diagrama de Bloques: Flujo Operativo Fase 3

![Diagrama de Bloques Fase 3](imagenes/04_Diag_Flujo_Fase3.png)
 
#### 6.3.4. 📝 Explicación de la Lógica de Control en la Fase 3


En esta etapa, los nodos de decisión no son simples filtros de paso, sino mecanismos de auditoría automatizada que confrontan la realidad física del retorno con la memoria inmutable grabada en las fases anteriores.

#### 6.3.4.1. Verificación de Integridad de Estado (Estado Actual vs. Fase 2)

Este es el primer filtro de seguridad de la dApp. El sistema compara el estado reportado por la Base Operativa al recibir el equipo frente al último hito de control registrado en la Fase 2.
•	Si NO ES IGUAL: Se detecta una inconsistencia física (ej. un equipo roto que se reportó como operativo en campo). El flujo se desvía inmediatamente al bloque "Abrir Investigación", vinculando permanentemente la Wallet del Operador responsable a una Alerta de Discrepancia.
•	Si ES IGUAL: El sistema valida la honestidad y diligencia del personal en el reporte de novedades y permite avanzar al siguiente control técnico.

#### 6.3.4.2. Validación de Consumo Nominal (Filtro de Eficiencia Técnica)

Para los insumos que aplique (como motobombas o cisternas), el Smart Contract ejecuta un cálculo en tiempo real: (Tiempo de operación × Consumo nominal pre-registrado).

•	Resultado SI (Correcto): El consumo reportado es físicamente posible. El Auditor procede a la "Auditoria Interna Aprobada", lo que dispara la liberación total del activo.
•	Resultado NO (Anomalía): Se detecta un consumo excesivo que no coincide con la capacidad técnica del equipo. El sistema deriva el caso al bloque de "Investigación" para determinar si existen posibles actos de corrupción o una avería técnica no detectada.

#### **6.3.4.3. Resolución y Destino Final del Activo**


Tras la validación del Handshake de Fase 3, el Smart Contract determina el destino del bien para cerrar el ciclo logístico de forma inmutable:

*   **Liberación de Custodia (Paz y Salvo)**: Se ejecuta automáticamente `inventario[ID].custodioActual = address(0)`, extinguiendo la responsabilidad legal del brigadista y limpiando su contador de recursos activos.
*   **Reintegro al Pool de Disponibilidad**: Si el peritaje es satisfactorio, el activo vuelve al estado **`Disponible`**, apareciendo instantáneamente como elegible en la Fase 1 para el siguiente despacho.
*   **Bloqueo por Anomalía (Estado = Taller)**: Si se detecta una discrepancia física o daño, el activo queda bloqueado en estado **`Taller`**. Esto obliga a que el proceso regrese a la Fase 1 para su reparación certificada, impidiendo que un equipo no apto sea asignado a una nueva emergencia.


