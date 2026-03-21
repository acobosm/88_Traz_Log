// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/TrazabilidadLogistica.sol";

contract TrazabilidadLogisticaTest is Test {
    TrazabilidadLogistica public trazabilidad;

    address public admin = address(1);
    address public base = address(2);
    address public jefe = address(3);
    address public operador = address(4);
    address public civil = address(5);

    bytes32 public constant BASE_OPERATIVA_ROLE =
        keccak256("BASE_OPERATIVA_ROLE");
    bytes32 public constant JEFE_ESCENA_ROLE = keccak256("JEFE_ESCENA_ROLE");
    bytes32 public constant OPERADOR_ROLE = keccak256("OPERADOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    address public nanami = address(6);

    function setUp() public {
        vm.prank(admin);
        trazabilidad = new TrazabilidadLogistica();

        // Registrar Roles Iniciales de la APP
        vm.startPrank(admin);
        trazabilidad.registrarPersonal(
            base,
            "Alice Liang",
            "Logistica",
            BASE_OPERATIVA_ROLE
        );
        trazabilidad.registrarPersonal(
            jefe,
            "Tony Corleone",
            "Incendios",
            JEFE_ESCENA_ROLE
        );
        trazabilidad.registrarPersonal(
            operador,
            "Sung Jin-woo",
            "Combate",
            OPERADOR_ROLE
        );
        trazabilidad.registrarPersonal(
            nanami,
            "Kento Nanami",
            "Auditor Forense",
            AUDITOR_ROLE
        );
        vm.stopPrank();
    }

    // --- 1. Tests de Personal y Roles ---

    function testRegistrarPersonal() public {
        address nuevoUser = address(10);
        vm.prank(admin);
        trazabilidad.registrarPersonal(
            nuevoUser,
            "Nuevo",
            "Tecnico",
            OPERADOR_ROLE
        );

        assertTrue(trazabilidad.hasRole(OPERADOR_ROLE, nuevoUser));
        (address billetera, string memory nombre, , bool activa) = trazabilidad
            .brigadistas(nuevoUser);
        assertEq(billetera, nuevoUser);
        assertEq(nombre, "Nuevo");
        assertTrue(activa);
    }

    function test_RevertWhen_RegistrarPersonalSinAdmin() public {
        vm.prank(civil);
        vm.expectRevert();
        trazabilidad.registrarPersonal(
            address(111),
            "Fallo",
            "Ninguna",
            OPERADOR_ROLE
        );
    }

    // --- 2. Tests de Insumos ---

    function testRegistroInsumo() public {
        vm.prank(base);
        bytes32 codigo = keccak256("ID-MB001");
        trazabilidad.registrarInsumo(codigo, "Motobomba Mark-3", 4000);

        (
            bytes32 inventarioCodigo,
            ,
            ,
            ,
            TrazabilidadLogistica.EstadoInsumo estado,
            ,
            ,
            uint256 consumo,

        ) = trazabilidad.inventario(codigo);
        assertEq(inventarioCodigo, codigo);
        assertEq(consumo, 4000);
        assertEq(
            uint(estado),
            uint(TrazabilidadLogistica.EstadoInsumo.Disponible)
        );
    }

    function testRegistrarInsumosBatch() public {
        bytes32[] memory codigos = new bytes32[](2);
        codigos[0] = keccak256("BATCH-1");
        codigos[1] = keccak256("BATCH-2");

        string[] memory descs = new string[](2);
        descs[0] = "Insumo Batch 1";
        descs[1] = "Insumo Batch 2";

        uint256[] memory consumos = new uint256[](2);
        consumos[0] = 100;
        consumos[1] = 200;

        vm.prank(base);
        trazabilidad.registrarInsumosBatch(codigos, descs, consumos);

        (bytes32 cod1, , , , , , , uint256 cons1, ) = trazabilidad.inventario(
            codigos[0]
        );
        (bytes32 cod2, , , , , , , uint256 cons2, ) = trazabilidad.inventario(
            codigos[1]
        );

        assertEq(cod1, codigos[0]);
        assertEq(cons1, 100);
        assertEq(cod2, codigos[1]);
        assertEq(cons2, 200);
    }

    function testRegistrarInsumosBatchSilentSkip() public {
        // 1. Registramos uno primero
        vm.prank(base);
        trazabilidad.registrarInsumo(keccak256("EXISTENTE"), "Viejo", 100);

        // 2. Intentamos un batch con el existente y uno nuevo
        bytes32[] memory codigos = new bytes32[](2);
        codigos[0] = keccak256("EXISTENTE");
        codigos[1] = keccak256("NUEVO");

        string[] memory descs = new string[](2);
        descs[0] = "Duplicado";
        descs[1] = "Nuevo Item";

        uint256[] memory consumos = new uint256[](2);
        consumos[0] = 500;
        consumos[1] = 500;

        vm.prank(base);
        trazabilidad.registrarInsumosBatch(codigos, descs, consumos);

        // 3. Verificamos: El viejo se mantiene igual, el nuevo se registró
        (, string memory descViejo, , , , , , , ) = trazabilidad.inventario(
            codigos[0]
        );
        (bytes32 codNuevo, , , , , , , , ) = trazabilidad.inventario(
            codigos[1]
        );

        assertEq(descViejo, "Viejo"); // No se sobreescribió
        assertEq(codNuevo, codigos[1]); // El nuevo sí entró
    }

    function test_RevertWhen_RegistroInsumoDuplicado() public {
        bytes32 codigo = keccak256("ID-DUPLICADO");
        vm.startPrank(base);
        trazabilidad.registrarInsumo(codigo, "Original", 0);
        vm.expectRevert("El insumo ya esta registrado");
        trazabilidad.registrarInsumo(codigo, "Duplicado", 0);
        vm.stopPrank();
    }

    // --- 3. Tests de Incidentes ---

    function testAbrirEventoIncendio() public {
        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("-1.02, -78.50", 4);

        (
            uint256 id,
            address jefeRegistrado,
            , // inicio unused
            ,
            string memory coords,
            uint256 riesgo,
            bool activo
        ) = trazabilidad.incendios(1);
        assertEq(id, 1);
        assertEq(jefeRegistrado, jefe);
        assertEq(riesgo, 4);
        assertTrue(activo);
        assertEq(coords, "-1.02, -78.50");
    }

    function testCerrarIncidenteDisparaEnRetorno() public {
        // 1. Preparar Insumo y Incendio
        vm.prank(base);
        bytes32 codigo = keccak256("ID-AUTORETURN");
        trazabilidad.registrarInsumo(codigo, "Manguera Automatica", 0);

        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("Coords", 1);

        vm.prank(jefe);
        trazabilidad.asignarInsumo(1, codigo, operador);

        // 2. Cerrar incidente
        vm.prank(jefe);
        trazabilidad.cerrarIncidente(1);

        // 3. Verificar estado EnRetorno automático
        (
            ,
            ,
            ,
            ,
            TrazabilidadLogistica.EstadoInsumo estado,
            ,
            ,
            ,

        ) = trazabilidad.inventario(codigo);
        assertEq(
            uint(estado),
            uint(TrazabilidadLogistica.EstadoInsumo.EnRetorno)
        );

        (, , , uint256 fin, , , bool activo) = trazabilidad.incendios(1);
        assertFalse(activo);
        assertGt(fin, 0);
    }

    function testActualizarRiesgoIncendio() public {
        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("Coords", 1);

        // Cambiar de 1 a 5
        vm.prank(jefe);
        vm.expectEmit(true, false, false, true);
        emit TrazabilidadLogistica.RiesgoActualizado(1, 1, 5, jefe);
        trazabilidad.actualizarRiesgoIncendio(1, 5);

        (, , , , , uint256 riesgo, ) = trazabilidad.incendios(1);
        assertEq(riesgo, 5);

        // Verificar bitácora
        (uint256 eventoID, , , , string memory detalles, ) = trazabilidad
            .bitacoraEvento(1, 0);
        assertEq(eventoID, 1);
        assertEq(detalles, "Cambio de Nivel de Riesgo: 1 -> 5");
    }

    function testActualizarRiesgoPorBase() public {
        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("Coords", 2);

        vm.prank(base);
        trazabilidad.actualizarRiesgoIncendio(1, 3);

        (, , , , , uint256 riesgo, ) = trazabilidad.incendios(1);
        assertEq(riesgo, 3);
    }

    function test_RevertWhen_ActualizarRiesgoSinRol() public {
        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("Coords", 1);

        vm.prank(operador);
        vm.expectRevert("No autorizado");
        trazabilidad.actualizarRiesgoIncendio(1, 3);
    }

    function test_RevertWhen_ActualizarRiesgoInvalido() public {
        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("Coords", 1);

        vm.prank(jefe);
        vm.expectRevert("Riesgo invalido");
        trazabilidad.actualizarRiesgoIncendio(1, 6);
    }

    function test_RevertWhen_CerrarIncidentePorOperador() public {
        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("Coords", 1);

        vm.prank(operador);
        vm.expectRevert();
        trazabilidad.cerrarIncidente(1);
    }

    // --- 4. Tests de Asignación y Flujo ---

    function testAsignarInsumo() public {
        vm.prank(base);
        bytes32 codigo = keccak256("ID-BF001");
        trazabilidad.registrarInsumo(codigo, "Batefuego", 0);

        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("0,0", 3);

        vm.prank(jefe);
        trazabilidad.asignarInsumo(1, codigo, operador);

        (
            ,
            ,
            ,
            address custodio,
            TrazabilidadLogistica.EstadoInsumo estado,
            ,
            ,
            ,

        ) = trazabilidad.inventario(codigo);
        assertEq(custodio, operador);
        assertEq(uint(estado), uint(TrazabilidadLogistica.EstadoInsumo.EnUso));
    }

    function test_RevertWhen_AsignarInsumoNoDisponible() public {
        vm.prank(base);
        bytes32 codigo = keccak256("ID-BUSY");
        trazabilidad.registrarInsumo(codigo, "Ocupado", 0);

        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("0,0", 3);

        vm.prank(jefe);
        trazabilidad.asignarInsumo(1, codigo, operador);

        // Intentar asignar otra vez (debería fallar por estado)
        vm.prank(jefe);
        vm.expectRevert("Insumo no disponible");
        trazabilidad.asignarInsumo(1, codigo, jefe);
    }

    // --- 5. Tests de Hitos y Auditoría ---

    function testRegistrarHito() public {
        vm.prank(base);
        bytes32 codigo = keccak256("ID-BF002");
        trazabilidad.registrarInsumo(codigo, "Batefuego", 0);

        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("0,0", 1);

        vm.prank(jefe);
        trazabilidad.asignarInsumo(1, codigo, operador);

        vm.prank(operador);
        trazabilidad.registrarHito(
            1,
            codigo,
            "Controlado",
            TrazabilidadLogistica.EstadoReportado.Operativo
        );

        (
            ,
            ,
            ,
            ,
            ,
            TrazabilidadLogistica.EstadoReportado reporte,
            ,
            ,

        ) = trazabilidad.inventario(codigo);
        assertEq(
            uint(reporte),
            uint(TrazabilidadLogistica.EstadoReportado.Operativo)
        );
    }

    function testRetornoConAlertaConsumoHandshake() public {
        vm.prank(base);
        bytes32 codigo = keccak256("ID-MB-EXP");
        trazabilidad.registrarInsumo(codigo, "Motobomba", 1000); // 1L/h

        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("0,0", 1);
        vm.prank(jefe);
        trazabilidad.asignarInsumo(1, codigo, operador);

        vm.warp(block.timestamp + 1 hours);

        // Disparar retorno (simulamos cierre de incidente para ponerlo en EnRetorno)
        vm.prank(jefe);
        trazabilidad.cerrarIncidente(1);

        // Paso 2: Auditoria de Base (Consumo real: 2000 ml -> Alerta!)
        vm.prank(base);
        trazabilidad.registrarAuditoria(
            codigo,
            TrazabilidadLogistica.EstadoInsumo.Disponible,
            2000,
            "Gasolina extra"
        );

        // Paso 3: Firma Brigadista (Aqui se procesan las alertas)
        vm.expectEmit(true, true, false, true);
        emit TrazabilidadLogistica.AlertaConsumo(0, codigo, 1000, 2000);

        vm.prank(operador);
        trazabilidad.firmarDeslinde(codigo);
    }

    function testRetornoConDiscrepanciaEstadoHandshake() public {
        vm.prank(base);
        bytes32 codigo = keccak256("ID-DISC");
        trazabilidad.registrarInsumo(codigo, "Equipo", 0);

        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("0,0", 1);
        vm.prank(jefe);
        trazabilidad.asignarInsumo(1, codigo, operador);

        vm.prank(operador);
        trazabilidad.registrarHito(
            1,
            codigo,
            "Perfecto",
            TrazabilidadLogistica.EstadoReportado.Operativo
        );

        // Brigadista inicia retorno manual (Anticipado)
        vm.prank(operador);
        trazabilidad.iniciarRetorno(codigo);

        // Base audita y encuentra daño (Discrepancia con el Operativo reportado)
        vm.prank(base);
        trazabilidad.registrarAuditoria(
            codigo,
            TrazabilidadLogistica.EstadoInsumo.Taller,
            0,
            unicode"Dañado fisicamente"
        );

        // Firma Brigadista acepta el Acta (Aqui saltan las discrepancias)
        vm.prank(operador);
        vm.expectEmit(true, true, false, true);
        emit TrazabilidadLogistica.DiscrepanciaRegistrada(
            0,
            codigo,
            unicode"Dañado fisicamente"
        );
        trazabilidad.firmarDeslinde(codigo);
    }

    function test_RevertWhen_RetornarInsumoDeprecado() public {
        vm.prank(base);
        vm.expectRevert(
            "Use el flujo de Handshake: registrarAuditoria + firmarDeslinde"
        );
        trazabilidad.retornarInsumo(
            bytes32(0),
            TrazabilidadLogistica.EstadoInsumo.Disponible,
            0,
            ""
        );
    }

    // --- 6. Tests de Pausa y Emergencia ---

    function testPausaYEmergencia() public {
        vm.prank(admin);
        trazabilidad.pause();
        assertTrue(trazabilidad.paused());

        vm.prank(jefe);
        vm.expectRevert("Pausable: paused");
        trazabilidad.abrirEventoIncendio("0,0", 1);

        vm.prank(admin);
        trazabilidad.unpause();
        assertFalse(trazabilidad.paused());

        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("0,0", 1); // Ahora debe funcionar
    }

    function test_RevertWhen_PausaSinAdmin() public {
        vm.prank(civil);
        vm.expectRevert();
        trazabilidad.pause();
    }

    function test_RevertWhen_AbrirEventoIncendioSinRol() public {
        vm.prank(civil);
        vm.expectRevert();
        trazabilidad.abrirEventoIncendio("0,0", 1);
    }

    function test_RevertWhen_RegistrarHitoSinCustodio() public {
        address operador2 = address(99);
        vm.prank(admin);
        trazabilidad.registrarPersonal(
            operador2,
            "Segundo Operador",
            "Apoyo",
            OPERADOR_ROLE
        );

        vm.prank(base);
        bytes32 codigo = keccak256("ID-HITO-FAIL");
        trazabilidad.registrarInsumo(codigo, "Test", 0);

        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("0,0", 1);

        vm.prank(jefe);
        trazabilidad.asignarInsumo(1, codigo, operador);

        // Operador 2 tiene el ROL, pero NO es el custodio de este ítem
        vm.prank(operador2);
        vm.expectRevert("No es el custodio");
        trazabilidad.registrarHito(
            1,
            codigo,
            "Fallo",
            TrazabilidadLogistica.EstadoReportado.Operativo
        );
    }

    function testRegistrarBitacoraTactica() public {
        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("0,0", 3);

        vm.prank(jefe);
        trazabilidad.registrarBitacoraTactica(
            1,
            '{"type":"pin", "latlng":[-1, -78], "pinType":"engine"}'
        );

        (
            uint256 eventoID,
            bytes32 codigoInsumo,
            address op,
            ,
            string memory detalles,

        ) = trazabilidad.bitacoraEvento(1, 0);
        assertEq(eventoID, 1);
        assertEq(codigoInsumo, bytes32(0));
        assertEq(op, jefe);
        assertEq(
            detalles,
            '{"type":"pin", "latlng":[-1, -78], "pinType":"engine"}'
        );
    }

    function test_RevertWhen_RegistrarBitacoraTacticaSinRol() public {
        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("0,0", 1);

        vm.prank(operador); // Operador no tiene permiso para bitacora táctica del jefe
        vm.expectRevert();
        trazabilidad.registrarBitacoraTactica(1, "Intento fallido");
    }

    function test_RevertWhen_RegistrarBitacoraTacticaEventoCerrado() public {
        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("0,0", 1);

        vm.prank(jefe);
        trazabilidad.cerrarIncidente(1);

        vm.prank(jefe);
        vm.expectRevert("Evento no activo");
        trazabilidad.registrarBitacoraTactica(1, "Ya cerro");
    }

    function testHitoRegistradoIndexedOperador() public {
        vm.prank(base);
        bytes32 codigo = keccak256("ID-INDEXED");
        trazabilidad.registrarInsumo(codigo, "Test Evento", 0);

        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("0,0", 1);
        vm.prank(jefe);
        trazabilidad.asignarInsumo(1, codigo, operador);

        // Verificar que el evento HitoRegistrado() emite el operador indexado
        vm.expectEmit(true, true, true, true);
        emit TrazabilidadLogistica.HitoRegistrado(
            1,
            codigo,
            operador,
            "Hito de prueba"
        );

        vm.prank(operador);
        trazabilidad.registrarHito(
            1,
            codigo,
            "Hito de prueba",
            TrazabilidadLogistica.EstadoReportado.Operativo
        );
    }

    function testHitoRegistradoEnRetornoYFirma() public {
        vm.prank(base);
        bytes32 codigo = keccak256("ID-HANDSHAKE-EVENT");
        trazabilidad.registrarInsumo(codigo, "Insumo Eventos", 0);

        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("0,0", 1);
        vm.prank(jefe);
        trazabilidad.asignarInsumo(1, codigo, operador);

        // 1. Evento en iniciarRetorno
        vm.expectEmit(true, true, true, true);
        emit TrazabilidadLogistica.HitoRegistrado(
            1,
            codigo,
            operador,
            "Retorno Anticipado: El equipo va de vuelta a base antes del cierre."
        );
        vm.prank(operador);
        trazabilidad.iniciarRetorno(codigo);

        // 2. Preparar auditoria
        vm.prank(base);
        trazabilidad.registrarAuditoria(
            codigo,
            TrazabilidadLogistica.EstadoInsumo.Disponible,
            0,
            "OK"
        );

        // 3. Evento en firmarDeslinde
        vm.expectEmit(true, true, true, true);
        emit TrazabilidadLogistica.HitoRegistrado(
            1,
            codigo,
            operador,
            "Acta de Devolucion Firmada: Insumo Eventos"
        );
        vm.prank(operador);
        trazabilidad.firmarDeslinde(codigo);
    }

    function testRegistrarReporteAuditoria() public {
        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("0,0", 1);

        // 1. Revertir si el incidente sigue activo
        vm.prank(nanami);
        vm.expectRevert("Incidente aun activo");
        trazabilidad.registrarReporteAuditoria(1, "Conclusion Beta");

        // 2. Cerrar incidente
        vm.prank(jefe);
        trazabilidad.cerrarIncidente(1);

        // 3. Registrar reporte exitoso
        vm.prank(nanami);
        vm.expectEmit(true, true, true, true);
        emit TrazabilidadLogistica.HitoRegistrado(
            1,
            bytes32(0),
            nanami,
            "Reporte Final V2"
        );
        trazabilidad.registrarReporteAuditoria(1, "Reporte Final V2");

        // 4. Verificar bitácora
        (
            uint256 id,
            bytes32 cod,
            address op,
            ,
            string memory detalles,

        ) = trazabilidad.bitacoraEvento(1, 1);
        assertEq(id, 1);
        assertEq(cod, bytes32(0));
        assertEq(op, nanami);
        assertEq(detalles, "PERITAJE FINAL AUDITORIA: Reporte Final V2");
    }

    function test_RevertWhen_RegistrarReporteAuditoriaSinRol() public {
        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("0,0", 1);
        vm.prank(jefe);
        trazabilidad.cerrarIncidente(1);

        vm.prank(operador);
        vm.expectRevert();
        trazabilidad.registrarReporteAuditoria(1, "Intento Fallido");
    }
}
