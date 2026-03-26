# 🔥 FireOPS: Trazabilidad Logística Global de Eventos y Equipamiento
## Documento Base para el Desarrollo de la dApp

---

### 🎯 Objetivo
Esta es una **Aplicación Descentralizada (dApp)** diseñada para revolucionar la gestión logística y operativa en el combate de **Incendios Forestales** y **Eventos de Quema Controlada**, integrando la **inmutabilidad de la tecnología Blockchain** con la eficiencia de los Sistemas de Comando de Incidentes.

*   **Perspectiva Organizacional**: Optimiza la respuesta ante emergencias al permitir un control dinámico y en tiempo real del ciclo de vida de los insumos (desde pesados como motobombas hasta manuales como batefuegos).
*   **Visión de Transparencia**: Actúa como un **auditor digital insobornable**, eliminando cualquier posibilidad de alteración de datos y asegurando una rendición de cuentas automatizada y auditable.

---

### 1. 👥 Jerarquía de Actores (Roles y RBAC)
La siguiente jerarquía define los permisos y responsabilidades dentro de la plataforma, basada en el estándar **AccessControl** de OpenZeppelin.

| Actor | Rol en la dApp | Ejemplo de Permisos |
| :--- | :--- | :--- |
| **Administrador Nacional** | `ADMIN_NACIONAL` | Despliega el contrato y gestiona cambios de roles. **Autoridad única para elevar personal a Auditor.** |
| **Bases Operativas** | `BASE_OPERATIVA` | Registra inventarios, mantenimiento y asigna Jefes de Escena. |
| **Jefe de Escena** | `JEFE_ESCENA` | Crea incidentes, asigna recursos a brigadas y registra fases. |
| **Brigadista / Operador** | `OPERADOR` | Registra uso, daño o pérdida de insumos en el campo. |
| **Verificador / Auditor** | `AUDITOR` | Consulta total: Revisa la cadena de eventos y rendición de cuentas. |
| **Público General** | `CONSULTOR` | Consulta pública para transparencia del estado de recursos. |

---

### 2. 🛡️ Arquitectura de Seguridad y Gobernanza

*   **Control de Acceso Granular**: Uso de identificadores únicos (`bytes32`) para una gestión dinámica de permisos. El Administrador puede revocar o añadir roles en tiempo real sin desplegar nuevo código.
*   **Pausa de Emergencia (Circuit Breaker)**: Implementación de `Pausable` para detener operaciones de escritura ante anomalías de seguridad.
*   **Prevención de Reentrada**: Uso de `nonReentrant` en funciones de actualización de inventario para evitar manipulaciones concurrentes.
*   **Trazabilidad de Gobernanza**: Emisión de eventos `RoleGranted` y `RoleRevoked` para auditoría forense inmutable de permisos.

---

### 3. 📝 Trazabilidad del Ciclo del Evento

#### 🚨 3.1. Fase Previa: Inventario y Disponibilidad
Enfoque en la gestión de activos y preparación táctica.
*   **Registro de Insumo Único**: Cada ítem posee un identificador ligado a su hoja de vida digital.
*   **Logs de Mantenimiento**: Registro inmutable de revisiones (ej: cambio de baterías en radios).
*   **Disponibilidad de Personal**: Sistema de "Log-in" con Wallet institucional para activar personal en el pool de despacho.

#### 🚒 3.2. Fase Durante: Asignación y Combate
Registro en tiempo real de la cadena de custodia.
*   **Apertura del Incidente**: Registro de coordenadas, nivel de riesgo y marca de tiempo.
*   **Handshake de Asignación**: Vinculación de recursos a un Brigadista responsable (Cambio de custodia).
*   **Reportes de Hito**: Registro de avances, consumo de suministros y geolocalización inmutable.

#### ✅ 3.3. Fase Post: Verificación y Auditoría
Cierre del ciclo y rendición de cuentas.
*   **Protocolo de Retorno**: Verificación dual (Físico vs Digital) del estado del equipo.
*   **Conciliación de Consumos**: Auditoría automática de suministros usados vs remanentes.
*   **Sello de Auditoría Final**: Cierre legal del evento que bloquea alteraciones posteriores.

---

### 4. 💾 Estructuras Técnicas (Solidity)

#### Estructuras de Datos Principales
*   `struct Insumo`: Define el ADN del activo (ID, descripción, base, custodio, estado).
*   `struct EventoIncendio`: Contenedor del incidente (Jefe, cronología, coordenadas, riesgo).
*   `struct LogOperativo`: La bitácora inmutable de cada acción en el campo.

#### Mapeos de Almacenamiento
*   `mapping(bytes32 => Insumo) public inventario`: Acceso instantáneo por código de equipo.
*   `mapping(address => Personal) public brigadistas`: Vinculo Wallet-Perfil Técnico.
*   `mapping(uint256 => LogOperativo[]) public bitacoraEvento`: Línea de tiempo táctica.

---

### 5. 🗺️ Diagrama de Arquitectura
![Diagrama de Bloques dApp FireOPS](imagenes/01_Diag_bloques_dApp.png)

---

### 6. 🏛️ Detalle de Procesos Operativos

#### 🛡️ Proceso Especial: Elevación de Perfiles
El sistema permite que un **Administrador** analice el historial de un Brigadista o Jefe de Escena y, mediante una transacción firmada, lo promueva al rol de **Auditor**. Este cambio queda registrado para siempre en la gobernanza del contrato.

#### 🛠️ Gestión de Mantenimiento
Cuando un equipo retorna con daño o cumple su ciclo, la `BASE_OPERATIVA` dispara un ticket de mantenimiento que bloquea el activo. Solo tras una reparación certificada, el equipo vuelve a estar "Disponible".

---

**Propósito**: PFM Ethereum para CodeCrypto Academy.
**Desarrollado por**: CBT
