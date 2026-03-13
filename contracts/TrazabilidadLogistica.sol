// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

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
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // FASE 5: Volver a Admin-only temporalmente
        /* FASE 5: Lista iterable y acceso Base Operativa
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
                hasRole(BASE_OPERATIVA_ROLE, msg.sender),
            "No autorizado para registrar personal"
        );
        */
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
        // listaPersonal.push(_billetera); // FASE 5
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
            activo: true
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

        inventario[_codigo].estado = EstadoInsumo.EnUso;
        inventario[_codigo].custodioActual = _operador;
        inventario[_codigo].inicioUso = block.timestamp;

        bitacoraEvento[_eventoID].push(
            LogOperativo({
                eventoID: _eventoID,
                codigoInsumo: _codigo,
                operador: _operador,
                timestamp: block.timestamp,
                detalles: "Asignado a combatiente",
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

        emit HitoRegistrado(_eventoID, _codigo, _detalles);
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

        emit HitoRegistrado(_eventoID, bytes32(0), _detalles);
    }

    function cerrarIncidente(
        uint256 _eventoID
    ) external onlyRole(JEFE_ESCENA_ROLE) {
        require(incendios[_eventoID].activo, "Ya cerrado");
        incendios[_eventoID].activo = false;
        incendios[_eventoID].timestampFin = block.timestamp;

        emit IncendioCerrado(_eventoID);
    }

    // --- Funciones Fase 3: Auditoría y Retorno ---

    function retornarInsumo(
        bytes32 _codigo,
        EstadoInsumo _estadoFinal,
        uint256 _consumoReal,
        string memory _motivoDiscrepancia
    ) external onlyRole(BASE_OPERATIVA_ROLE) nonReentrant {
        Insumo storage insumo = inventario[_codigo];
        require(
            insumo.estado == EstadoInsumo.EnUso ||
                insumo.estado == EstadoInsumo.EnRetorno,
            "No estaba en uso"
        );

        // --- Lógica de Auditoría Automática de Consumo ---
        if (insumo.consumoNominal > 0 && insumo.inicioUso > 0) {
            uint256 tiempoUsoSegundos = block.timestamp - insumo.inicioUso;
            // Cálculo: (Tiempo en horas) * consumoNominal
            // Usamos base de segundos para mayor precisión.
            uint256 consumoEsperado = (tiempoUsoSegundos *
                insumo.consumoNominal) / 3600;

            // Alerta si el consumo real supera el esperado en más de un 20% (ajustable)
            if (_consumoReal > (consumoEsperado * 120) / 100) {
                emit AlertaConsumo(0, _codigo, consumoEsperado, _consumoReal);
            }
        }

        if (uint8(_estadoFinal) != uint8(insumo.estadoReportadoF2)) {
            // Guardar discrepancia si el estado final no coincide con lo reportado por el operador
            emit DiscrepanciaRegistrada(0, _codigo, _motivoDiscrepancia); // Usamos 0 si es auditoría general
        }

        insumo.estado = _estadoFinal;
        insumo.custodioActual = address(0);
        insumo.inicioUso = 0;
        insumo.ultimoMantenimiento = block.timestamp;

        emit InsumoRetornado(_codigo, _estadoFinal);
    }

    // --- Funciones de Vista ---

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
