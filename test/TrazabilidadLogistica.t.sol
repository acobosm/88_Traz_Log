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

    function setUp() public {
        vm.prank(admin);
        trazabilidad = new TrazabilidadLogistica();

        // Registrar Roles Iniciales de la APP
        vm.startPrank(admin);
        trazabilidad.registrarPersonal(
            base,
            "Base Central",
            "Logistica",
            BASE_OPERATIVA_ROLE
        );
        trazabilidad.registrarPersonal(
            jefe,
            "Jefe Garcia",
            "Incendios",
            JEFE_ESCENA_ROLE
        );
        trazabilidad.registrarPersonal(
            operador,
            "Operador Juan",
            "Combate",
            OPERADOR_ROLE
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
            uint256 inicio,
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

    function testCerrarIncidente() public {
        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("Coords", 1);

        vm.prank(jefe);
        trazabilidad.cerrarIncidente(1);

        (, , , uint256 fin, , , bool activo) = trazabilidad.incendios(1);
        assertFalse(activo);
        assertGt(fin, 0);
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

    function testRetornoConAlertaConsumo() public {
        vm.prank(base);
        bytes32 codigo = keccak256("ID-MB-EXP");
        trazabilidad.registrarInsumo(codigo, "Motobomba", 1000); // 1L/h

        vm.prank(jefe);
        trazabilidad.abrirEventoIncendio("0,0", 1);
        vm.prank(jefe);
        trazabilidad.asignarInsumo(1, codigo, operador);

        vm.warp(block.timestamp + 1 hours);

        // Consumo esperado: 1000 ml
        // Reporte: 2000 ml (Alerta!)
        vm.prank(base);
        vm.expectEmit(true, true, false, true);
        emit TrazabilidadLogistica.AlertaConsumo(0, codigo, 1000, 2000);
        trazabilidad.retornarInsumo(
            codigo,
            TrazabilidadLogistica.EstadoInsumo.Disponible,
            2000,
            "Gasolina extra"
        );
    }

    function testRetornoConDiscrepanciaEstado() public {
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

        vm.prank(base);
        vm.expectEmit(true, true, false, true);
        emit TrazabilidadLogistica.DiscrepanciaRegistrada(
            0,
            codigo,
            unicode"Dañado fisicamente"
        );
        trazabilidad.retornarInsumo(
            codigo,
            TrazabilidadLogistica.EstadoInsumo.Taller,
            0,
            unicode"Dañado fisicamente"
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
}
