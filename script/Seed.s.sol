// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/TrazabilidadLogistica.sol";

contract SeedTrazabilidad is Script {
    bytes32 public constant BASE_OPERATIVA_ROLE =
        keccak256("BASE_OPERATIVA_ROLE");
    bytes32 public constant JEFE_ESCENA_ROLE = keccak256("JEFE_ESCENA_ROLE");
    bytes32 public constant OPERADOR_ROLE = keccak256("OPERADOR_ROLE");

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Dirección del contrato desplegado (se debe pasar como variable de entorno)
        address contractAddr = vm.envAddress("CONTRACT_ADDRESS");
        TrazabilidadLogistica trazabilidad = TrazabilidadLogistica(
            payable(contractAddr)
        );

        vm.startBroadcast(deployerPrivateKey);

        // 1. Registro de Personal y Roles
        address base = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8); // Anvil #1
        address jefe = address(0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65); // Anvil #3 (Aura)
        address operador = address(0x4e59b44847b379578588920cA78FbF26c0B4956C); // Anvil #7

        (address walletBase, , , bool activoBase) = trazabilidad.brigadistas(
            base
        );
        if (!activoBase) {
            trazabilidad.registrarPersonal(
                base,
                "Base Central",
                "Logistica",
                BASE_OPERATIVA_ROLE
            );
        }

        (address walletJefe, , , bool activoJefe) = trazabilidad.brigadistas(
            jefe
        );
        if (!activoJefe) {
            trazabilidad.registrarPersonal(
                jefe,
                "Aura (Jefe Escena)",
                "Incendios",
                JEFE_ESCENA_ROLE
            );
        } else {
            // Aseguramos que tenga el rol aunque ya este registrado como personal
            trazabilidad.grantRole(JEFE_ESCENA_ROLE, jefe);
        }

        (address walletOperador, , , bool activoOperador) = trazabilidad
            .brigadistas(operador);
        if (!activoOperador) {
            trazabilidad.registrarPersonal(
                operador,
                "Operador Juan",
                "Combate",
                OPERADOR_ROLE
            );
        }

        // 2. Registro de Insumos vía Batch (Idempotente)
        trazabilidad.grantRole(BASE_OPERATIVA_ROLE, deployer);

        bytes32[] memory codigos = new bytes32[](26);
        string[] memory descripciones = new string[](26);
        uint256[] memory consumos = new uint256[](26);

        codigos[0] = keccak256("ID-HZ001");
        descripciones[0] = "ID-HZ001 | Herramienta de Zapa (Raspado)";
        consumos[0] = 0;
        codigos[1] = keccak256("ID-MA001");
        descripciones[1] = "ID-MA001 | Machete de corte denso";
        consumos[1] = 0;
        codigos[2] = keccak256("ID-PL001");
        descripciones[2] = "ID-PL001 | Herramienta Pulaski (Hacha/Azadon)";
        consumos[2] = 0;
        codigos[3] = keccak256("ID-MC001");
        descripciones[3] = "ID-MC001 | Rastrillo McLeod (Suelo Mineral)";
        consumos[3] = 0;
        codigos[4] = keccak256("ID-BF001");
        descripciones[4] = "ID-BF001 | Batefuego Forestal (Sofocacion)";
        consumos[4] = 0;
        codigos[5] = keccak256("ID-BF002");
        descripciones[5] = "ID-BF002 | Batefuego Forestal (Sofocacion)";
        consumos[5] = 0;
        codigos[6] = keccak256("ID-BF003");
        descripciones[6] = "ID-BF003 | Batefuego Forestal (Sofocacion)";
        consumos[6] = 0;
        codigos[7] = keccak256("ID-BF004");
        descripciones[7] = "ID-BF004 | Batefuego Forestal (Sofocacion)";
        consumos[7] = 0;
        codigos[8] = keccak256("ID-BF005");
        descripciones[8] = "ID-BF005 | Batefuego Forestal (Sofocacion)";
        consumos[8] = 0;
        codigos[9] = keccak256("ID-BF006");
        descripciones[9] = "ID-BF006 | Batefuego Forestal (Sofocacion)";
        consumos[9] = 0;
        codigos[10] = keccak256("ID-BF007");
        descripciones[10] = "ID-BF007 | Batefuego Forestal (Sofocacion)";
        consumos[10] = 0;
        codigos[11] = keccak256("ID-BF008");
        descripciones[11] = "ID-BF008 | Batefuego Forestal (Sofocacion)";
        consumos[11] = 0;
        codigos[12] = keccak256("ID-BF009");
        descripciones[12] = "ID-BF009 | Batefuego Forestal (Sofocacion)";
        consumos[12] = 0;
        codigos[13] = keccak256("ID-BF010");
        descripciones[13] = "ID-BF010 | Batefuego Forestal (Sofocacion)";
        consumos[13] = 0;
        codigos[14] = keccak256("ID-PA001");
        descripciones[14] = "ID-PA001 | Pala (Control de puntos calientes)";
        consumos[14] = 0;
        codigos[15] = keccak256("ID-MB001");
        descripciones[15] = "ID-MB001 | Motobomba Portatil Waterax Mark-3";
        consumos[15] = 4000;
        codigos[16] = keccak256("ID-MG001");
        descripciones[16] = "ID-MG001 | Tramo de Manguera de Incendio 1.5 pulg";
        consumos[16] = 0;
        codigos[17] = keccak256("ID-MX001");
        descripciones[17] = "ID-MX001 | Mochila de Agua (Bomba de Espalda 20L)";
        consumos[17] = 0;
        codigos[18] = keccak256("ID-V4001");
        descripciones[18] = "ID-V4001 | Vehiculo 4x4 Transporte Brigada";
        consumos[18] = 10000;
        codigos[19] = keccak256("ID-AM001");
        descripciones[19] = "ID-AM001 | Ambulancia Soporte Vital";
        consumos[19] = 8000;
        codigos[20] = keccak256("ID-TC001");
        descripciones[20] = "ID-TC001 | Vehiculo Cisterna (Tanquero) 2000G";
        consumos[20] = 15000;
        codigos[21] = keccak256("ID-RD001");
        descripciones[21] = "ID-RD001 | Radio Portatil Motorola DGP8550e";
        consumos[21] = 0;
        codigos[22] = keccak256("ID-GP001");
        descripciones[22] = "ID-GP001 | GPS Garmin (Georreferenciacion)";
        consumos[22] = 0;
        codigos[23] = keccak256("ID-CS001");
        descripciones[23] = "ID-CS001 | Casco de Proteccion Forestal";
        consumos[23] = 0;
        codigos[24] = keccak256("ID-GT001");
        descripciones[24] = "ID-GT001 | Guantes de Cuero Termicos";
        consumos[24] = 0;
        codigos[25] = keccak256("ID-BT001");
        descripciones[25] = "ID-BT001 | Botas de Combate Forestal";
        consumos[25] = 0;

        trazabilidad.registrarInsumosBatch(codigos, descripciones, consumos);

        vm.stopBroadcast();
    }
}
