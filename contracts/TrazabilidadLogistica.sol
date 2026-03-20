// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title TrazabilidadLogistica
 * @dev Sistema de trazabilidad para la gestión de incendios forestales.
 */
contract TrazabilidadLogistica is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant BASE_OPERATIVA_ROLE =
        keccak256("BASE_OPERATIVA_ROLE");
    bytes32 public constant JEFE_ESCENA_ROLE = keccak256("JEFE_ESCENA_ROLE");
    bytes32 public constant OPERADOR_ROLE = keccak256("OPERADOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant CONSULTOR_ROLE = keccak256("CONSULTOR_ROLE");


    // --- Enumeraciones ---

    enum EstadoInsumo { //Verificación Física de la Base Operativa al recibir equipo
        Disponible,
        EnUso,
        Taller,
        Perdido,
        EnRetorno
    }
    enum EstadoReportado { //Declaración jurada del Brigadista en el Campo
        Operativo,
        DanoMenor,
        DanoCritico,
        Perdido
    }

    // --- Estructuras de Datos ---

    struct Personal {
        address billetera;
        string nombre;
        string especialidad;
        bool estaActivo;
    }

    struct Insumo {
        bytes32 codigoInventario;
        string descripcion;
        address basePropietaria;
        address custodioActual;
        EstadoInsumo estado; //Verificación Física de la Base Operativa al recibir equipo
        EstadoReportado estadoReportadoF2; //Declaración jurada del Brigadista en el Campo
        uint256 ultimoMantenimiento;
        uint256 consumoNominal; // Consumo esperado por hora (en ml o litros)
        uint256 inicioUso; // Timestamp de asignación para cálculo de auditoría
    }

    struct EventoIncendio {
        uint256 eventoID;
        address jefeDeEscena;
        uint256 timestampInicio;
        uint256 timestampFin;
        string coordenadas;
        uint256 riesgo; // 1-5
        bool activo;
        bytes32[] recursosAsignados; // Seguimiento de recursos para cierre automático
    }

    struct AuditoriaPendiente {
        EstadoInsumo estadoPropuesto;
        uint256 consumoReal;
        string motivo;
        bool activa;
    }

    struct LogOperativo {
        uint256 eventoID;
        bytes32 codigoInsumo;
        address operador;
        uint256 timestamp;
        string detalles;
        bool esDiscrepancia;
    }

    // --- Almacenamiento ---

    uint256 public nextEventoID = 1;

    mapping(bytes32 => Insumo) public inventario;
    mapping(address => Personal) public brigadistas;
    mapping(uint256 => EventoIncendio) public incendios;
    mapping(uint256 => LogOperativo[]) public bitacoraEvento;
    mapping(address => bool) public basesAutorizadas;
    address[] public listaPersonal; // Lista iterable para el frontend
    mapping(bytes32 => AuditoriaPendiente) public auditoriasPendientes; // Handshake de retorno

    // --- Seguimiento de Despliegue (Fase 3.19) ---
    mapping(address => uint256) public despliegueActual; // ID del incidente donde está trabajando
    mapping(address => uint256) public contadorRecursos; // Cuántos activos tiene en custodia

    // --- Eventos ---

    event InsumoRegistrado(
        bytes32 indexed codigo,
        string descripcion,
        address base
    );
    event InsumoAsignado(
        uint256 indexed eventoID,
        bytes32 indexed codigo,
        address operador
    );
    event HitoRegistrado(
        uint256 indexed eventoID,
        bytes32 indexed codigo,
        address indexed operador,
        string detalles
    );
    event IncendioIniciado(
        uint256 indexed eventoID,
        string coordenadas,
        uint256 riesgo
    );
    event IncendioCerrado(uint256 indexed eventoID);
    event InsumoRetornado(bytes32 indexed codigo, EstadoInsumo estadoFinal);
    event AlertaConsumo(
        uint256 indexed eventoID,
        bytes32 indexed codigo,
        uint256 esperado,
        uint256 real
    );
    event DiscrepanciaRegistrada(
        uint256 indexed eventoID,
        bytes32 indexed codigo,
        string motivo
    );
    event RiesgoActualizado(
        uint256 indexed eventoID,
        uint256 viejoRiesgo,
        uint256 nuevoRiesgo,
        address autor
    );

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // --- Funciones Fase 1: Inventario y Personal ---

    /**
     * @dev Registra a un brigadista en el sistema.
     * Ahora permitido también para la BASE_OPERATIVA_ROLE para agilizar el despliegue.
     */
    function registrarPersonal(
        address _billetera,
        string memory _nombre,
        string memory _especialidad,
        bytes32 _role
    ) external whenNotPaused {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
                hasRole(BASE_OPERATIVA_ROLE, msg.sender),
            "No autorizado para registrar personal"
        );
        require(
            brigadistas[_billetera].billetera == address(0),
            "Ya registrado"
        );

        brigadistas[_billetera] = Personal({
            billetera: _billetera,
            nombre: _nombre,
            especialidad: _especialidad,
            estaActivo: true
        });
        listaPersonal.push(_billetera); // FASE 5
        _setupRole(_role, _billetera);
    }

    function registrarInsumo(
        bytes32 codigo,
        string calldata descripcion,
        uint256 consumoNominal
    ) public onlyRole(BASE_OPERATIVA_ROLE) whenNotPaused {
        _registrarInsumo(codigo, descripcion, consumoNominal);
    }

    function _registrarInsumo(
        bytes32 codigo,
        string memory descripcion,
        uint256 consumoNominal
    ) internal {
        require(
            inventario[codigo].codigoInventario == bytes32(0),
            "El insumo ya esta registrado"
        );
        inventario[codigo] = Insumo({
            codigoInventario: codigo,
            descripcion: descripcion,
            basePropietaria: tx.origin, // Usamos tx.origin para mantener la base original en batches si es necesario
            custodioActual: tx.origin,
            estado: EstadoInsumo.Disponible,
            estadoReportadoF2: EstadoReportado.Operativo,
            ultimoMantenimiento: block.timestamp,
            consumoNominal: consumoNominal,
            inicioUso: 0
        });
        emit InsumoRegistrado(codigo, descripcion, tx.origin);
    }

    /**
     * @dev Registra múltiples insumos en una sola transacción para optimizar gas y facilitar carga masiva (CSV).
     * @param codigos Arreglo de identificadores únicos.
     * @param descripciones Arreglo de nombres/descripciones.
     * @param consumos Arreglo de consumos nominales (ml/h).
     */
    function registrarInsumosBatch(
        bytes32[] calldata codigos,
        string[] calldata descripciones,
        uint256[] calldata consumos
    ) external onlyRole(BASE_OPERATIVA_ROLE) whenNotPaused nonReentrant {
        require(
            codigos.length == descripciones.length &&
                codigos.length == consumos.length,
            "Longitud de arreglos inconsistente"
        );

        for (uint256 i = 0; i < codigos.length; i++) {
            // Salto Silencioso (Idempotencia): Solo registramos si NO existe
            if (inventario[codigos[i]].codigoInventario == bytes32(0)) {
                _registrarInsumo(codigos[i], descripciones[i], consumos[i]);
            }
            // Si ya existe, simplemente lo ignoramos para no romper el lote
        }
    }

    // --- Funciones Fase 2: Gestión de Incidentes ---

    function abrirEventoIncendio(
        string memory _coordenadas,
        uint256 _riesgo
    ) external onlyRole(JEFE_ESCENA_ROLE) whenNotPaused {
        uint256 _id = nextEventoID++;
        incendios[_id] = EventoIncendio({
            eventoID: _id,
            jefeDeEscena: msg.sender,
            timestampInicio: block.timestamp,
            timestampFin: 0,
            coordenadas: _coordenadas,
            riesgo: _riesgo,
            activo: true,
            recursosAsignados: new bytes32[](0)
        });

        emit IncendioIniciado(_id, _coordenadas, _riesgo);
    }

    function asignarInsumo(
        uint256 _eventoID,
        bytes32 _codigo,
        address _operador
    ) external onlyRole(JEFE_ESCENA_ROLE) nonReentrant whenNotPaused {
        require(incendios[_eventoID].activo, "Evento no activo");
        require(
            inventario[_codigo].estado == EstadoInsumo.Disponible,
            "Insumo no disponible"
        );
        require(
            hasRole(OPERADOR_ROLE, _operador),
            "Destinatario no es operador"
        );

        // --- Verificación de Exclusividad (Fase 3.19) ---
        require(
            despliegueActual[_operador] == 0 || despliegueActual[_operador] == _eventoID,
            "Brigadista asignado a otro incidente activo"
        );

        inventario[_codigo].estado = EstadoInsumo.EnUso;
        inventario[_codigo].custodioActual = _operador;
        inventario[_codigo].inicioUso = block.timestamp;
        
        // Actualizar seguimiento de despliegue
        incendios[_eventoID].recursosAsignados.push(_codigo);
        despliegueActual[_operador] = _eventoID;
        contadorRecursos[_operador]++;

        string memory nombreInsumo = inventario[_codigo].descripcion;
        string memory nombreOperador = brigadistas[_operador].nombre;
        string memory mensajeDetalle = string.concat("Asignacion de Recurso: ", nombreInsumo, " entregado a ", nombreOperador);

        bitacoraEvento[_eventoID].push(
            LogOperativo({
                eventoID: _eventoID,
                codigoInsumo: _codigo,
                operador: _operador,
                timestamp: block.timestamp,
                detalles: mensajeDetalle,
                esDiscrepancia: false
            })
        );

        emit InsumoAsignado(_eventoID, _codigo, _operador);
    }

    function registrarHito(
        uint256 _eventoID,
        bytes32 _codigo,
        string memory _detalles,
        EstadoReportado _nuevoEstadoProvisional
    ) external onlyRole(OPERADOR_ROLE) {
        require(
            inventario[_codigo].custodioActual == msg.sender,
            "No es el custodio"
        );

        inventario[_codigo].estadoReportadoF2 = _nuevoEstadoProvisional;

        bitacoraEvento[_eventoID].push(
            LogOperativo({
                eventoID: _eventoID,
                codigoInsumo: _codigo,
                operador: msg.sender,
                timestamp: block.timestamp,
                detalles: _detalles,
                esDiscrepancia: false
            })
        );

        emit HitoRegistrado(_eventoID, _codigo, msg.sender, _detalles);
    }

    /**
     * @dev Permite al Jefe de Escena registrar hitos tácticos (pines, zonas, notas) en la bitácora global.
     * @param _eventoID ID del incidente.
     * @param _detalles Descripción del hito o coordenadas del pin en formato JSON/Texto.
     */
    function registrarBitacoraTactica(
        uint256 _eventoID,
        string calldata _detalles
    ) external onlyRole(JEFE_ESCENA_ROLE) whenNotPaused {
        require(incendios[_eventoID].activo, "Evento no activo");

        bitacoraEvento[_eventoID].push(
            LogOperativo({
                eventoID: _eventoID,
                codigoInsumo: bytes32(0),
                operador: msg.sender,
                timestamp: block.timestamp,
                detalles: _detalles,
                esDiscrepancia: false
            })
        );

        emit HitoRegistrado(_eventoID, bytes32(0), msg.sender, _detalles);
    }

    function cerrarIncidente(
        uint256 _eventoID
    ) external onlyRole(JEFE_ESCENA_ROLE) whenNotPaused {
        require(incendios[_eventoID].activo, "Ya cerrado");
        incendios[_eventoID].activo = false;
        incendios[_eventoID].timestampFin = block.timestamp;

        // Disparador Automático: Todos los recursos asignados pasan a "EnRetorno"
        bytes32[] memory recursos = incendios[_eventoID].recursosAsignados;
        for (uint256 i = 0; i < recursos.length; i++) {
            bytes32 codigo = recursos[i];
            if (inventario[codigo].estado == EstadoInsumo.EnUso) {
                inventario[codigo].estado = EstadoInsumo.EnRetorno;
            }
        }

        emit IncendioCerrado(_eventoID);
    }

    /**
     * @dev Permite actualizar el nivel de riesgo de un incendio activo.
     * @param _eventoID ID del incidente.
     * @param _nuevoRiesgo Nuevo nivel de riesgo (1-5).
     */
    function actualizarRiesgoIncendio(
        uint256 _eventoID,
        uint256 _nuevoRiesgo
    ) external whenNotPaused {
        require(
            hasRole(JEFE_ESCENA_ROLE, msg.sender) ||
                hasRole(BASE_OPERATIVA_ROLE, msg.sender),
            "No autorizado"
        );
        require(incendios[_eventoID].activo, "Evento no activo");
        require(_nuevoRiesgo >= 1 && _nuevoRiesgo <= 5, "Riesgo invalido");

        uint256 riesgoAnterior = incendios[_eventoID].riesgo;
        incendios[_eventoID].riesgo = _nuevoRiesgo;

        bitacoraEvento[_eventoID].push(
            LogOperativo({
                eventoID: _eventoID,
                codigoInsumo: bytes32(0),
                operador: msg.sender,
                timestamp: block.timestamp,
                detalles: string.concat(
                    "Cambio de Nivel de Riesgo: ",
                    Strings.toString(riesgoAnterior),
                    " -> ",
                    Strings.toString(_nuevoRiesgo)
                ),
                esDiscrepancia: false
            })
        );

        emit RiesgoActualizado(
            _eventoID,
            riesgoAnterior,
            _nuevoRiesgo,
            msg.sender
        );
    }

    // --- Funciones Fase 3: Auditoría y Retorno ---

    /**
     * @dev Paso 1 del Handshake (Brigadista): Deslinde manual temprano.
     * Útil si el equipo se rompe antes de que acabe el incendio.
     */
    function iniciarRetorno(bytes32 _codigo) external onlyRole(OPERADOR_ROLE) whenNotPaused {
        require(inventario[_codigo].custodioActual == msg.sender, "No es el custodio");
        require(inventario[_codigo].estado == EstadoInsumo.EnUso, "No esta en uso");
        
        inventario[_codigo].estado = EstadoInsumo.EnRetorno;
        // El brigadista declara que el equipo va de vuelta.
        // Registramos un hito automático de retorno.
        uint256 eventoID = despliegueActual[msg.sender];
        if (eventoID != 0) {
            string memory detalleRetorno = "Retorno Anticipado: El equipo va de vuelta a base antes del cierre.";
            bitacoraEvento[eventoID].push(LogOperativo({
                eventoID: eventoID,
                codigoInsumo: _codigo,
                operador: msg.sender,
                timestamp: block.timestamp,
                detalles: detalleRetorno,
                esDiscrepancia: false
            }));
            emit HitoRegistrado(eventoID, _codigo, msg.sender, detalleRetorno);
        }
    }

    /**
     * @dev Paso 2 del Handshake (Base Operativa): Auditoria de recepción fisica.
     */
    function registrarAuditoria(
        bytes32 _codigo,
        EstadoInsumo _estadoPropuesto,
        uint256 _consumoReal,
        string memory _motivoDiscrepancia
    ) external onlyRole(BASE_OPERATIVA_ROLE) whenNotPaused nonReentrant {
        require(inventario[_codigo].estado == EstadoInsumo.EnRetorno, "No esta en retorno");
        
        auditoriasPendientes[_codigo] = AuditoriaPendiente({
            estadoPropuesto: _estadoPropuesto,
            consumoReal: _consumoReal,
            motivo: _motivoDiscrepancia,
            activa: true
        });

        // El equipo queda bloqueado esperando la firma del brigadista.
    }

    /**
     * @dev Paso 3 del Handshake (Brigadista): Firma de Acta y Liberacion.
     * El brigadista firma que esta de acuerdo con la auditoria de base.
     */
    function firmarDeslinde(bytes32 _codigo) external onlyRole(OPERADOR_ROLE) whenNotPaused nonReentrant {
        require(inventario[_codigo].custodioActual == msg.sender, "No es el custodio");
        require(auditoriasPendientes[_codigo].activa, "No hay auditoria pendiente");

        AuditoriaPendiente memory aud = auditoriasPendientes[_codigo];
        Insumo storage insumo = inventario[_codigo];

        // --- Lógica de Auditoría Automática de Consumo ---
        if (insumo.consumoNominal > 0 && insumo.inicioUso > 0) {
            uint256 tiempoUsoSegundos = block.timestamp - insumo.inicioUso;
            uint256 consumoEsperado = (tiempoUsoSegundos * insumo.consumoNominal) / 3600;

            if (aud.consumoReal > (consumoEsperado * 120) / 100) {
                emit AlertaConsumo(0, _codigo, consumoEsperado, aud.consumoReal);
            }
        }

        if (uint8(aud.estadoPropuesto) != uint8(insumo.estadoReportadoF2)) {
            emit DiscrepanciaRegistrada(0, _codigo, aud.motivo);
        }

        insumo.estado = aud.estadoPropuesto;
        address operadorSaliente = insumo.custodioActual;
        insumo.custodioActual = address(0);
        insumo.inicioUso = 0;
        insumo.ultimoMantenimiento = block.timestamp;
        
        // Limpiamos auditoria
        delete auditoriasPendientes[_codigo];

        // Paso 3.19: Registro de hito de firma para historial del brigadista
        uint256 eventoID = despliegueActual[msg.sender];
        if (eventoID != 0) {
            string memory detalleFirma = string.concat("Acta de Devolucion Firmada: ", inventario[_codigo].descripcion);
            bitacoraEvento[eventoID].push(LogOperativo({
                eventoID: eventoID,
                codigoInsumo: _codigo,
                operador: msg.sender,
                timestamp: block.timestamp,
                detalles: detalleFirma,
                esDiscrepancia: false
            }));
            emit HitoRegistrado(eventoID, _codigo, msg.sender, detalleFirma);
        }

        // Liberar brigadista (Fase 3.19)
        if (contadorRecursos[operadorSaliente] > 0) {
            contadorRecursos[operadorSaliente]--;
            if (contadorRecursos[operadorSaliente] == 0) {
                despliegueActual[operadorSaliente] = 0;
            }
        }

        emit InsumoRetornado(_codigo, aud.estadoPropuesto);
    }

    // Deprecamos la funcion anterior de retorno directo
    function retornarInsumo(bytes32, EstadoInsumo, uint256, string memory) external pure {
        revert("Use el flujo de Handshake: registrarAuditoria + firmarDeslinde");
    }


    // --- Funciones de Vista ---

    /**
     * @dev Retorna la lista completa de direcciones de personal registrado.
     */
    function getListaPersonal() external view returns (address[] memory) {
        return listaPersonal;
    }

    /**
     * @dev Retorna la bitácora completa de un evento para su reconstrucción en el mapa.
     */
    function obtenerLogEvento(
        uint256 _eventoID
    ) external view returns (LogOperativo[] memory) {
        return bitacoraEvento[_eventoID];
    }

    // --- Administración ---

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
