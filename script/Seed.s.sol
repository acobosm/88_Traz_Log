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

        // 1. Registro de Personal y Roles (Ajustado a propuesta del proyecto)
        address base = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8); // Anvil #1
        address jefe = address(0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65); // Anvil #3
        address operador = address(0x4e59b44847b379578588920cA78FbF26c0B4956C); // Anvil #7

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

        // 2. Registro de Insumos
        // El Administrador (deployer) se auto-asigna el rol BASE_OPERATIVA temporalmente para la carga masiva
        trazabilidad.grantRole(BASE_OPERATIVA_ROLE, deployer);

        // Lista de Insumos
        trazabilidad.registrarInsumo(
            keccak256("ID-HZ001"),
            "Herramienta de Zapa (Raspado)",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-MA001"),
            "Machete de corte denso",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-PL001"),
            "Herramienta Pulaski (Hacha/Azadon)",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-MC001"),
            "Rastrillo McLeod (Suelo Mineral)",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-BF001"),
            "Batefuego Forestal (Sofocacion)",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-BF002"),
            "Batefuego Forestal (Sofocacion)",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-BF003"),
            "Batefuego Forestal (Sofocacion)",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-BF004"),
            "Batefuego Forestal (Sofocacion)",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-BF005"),
            "Batefuego Forestal (Sofocacion)",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-BF006"),
            "Batefuego Forestal (Sofocacion)",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-BF007"),
            "Batefuego Forestal (Sofocacion)",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-BF008"),
            "Batefuego Forestal (Sofocacion)",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-BF009"),
            "Batefuego Forestal (Sofocacion)",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-BF010"),
            "Batefuego Forestal (Sofocacion)",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-PA001"),
            "Pala (Control de puntos calientes)",
            0
        );

        trazabilidad.registrarInsumo(
            keccak256("ID-MB001"),
            "Motobomba Portatil Waterax Mark-3",
            4000
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-MG001"),
            "Tramo de Manguera de Incendio 1.5 pulg",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-MX001"),
            "Mochila de Agua (Bomba de Espalda 20L)",
            0
        );

        trazabilidad.registrarInsumo(
            keccak256("ID-V4001"),
            "Vehiculo 4x4 Transporte Brigada",
            10000
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-AM001"),
            "Ambulancia Soporte Vital",
            8000
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-TC001"),
            "Vehiculo Cisterna (Tanquero) 2000G",
            15000
        );

        trazabilidad.registrarInsumo(
            keccak256("ID-RD001"),
            "Radio Portatil Motorola DGP8550e",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-GP001"),
            "GPS Garmin (Georreferenciacion)",
            0
        );

        trazabilidad.registrarInsumo(
            keccak256("ID-CS001"),
            "Casco de Proteccion Forestal",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-GT001"),
            "Guantes de Cuero Termicos",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-BT001"),
            "Botas de Combate Forestal",
            0
        );
        trazabilidad.registrarInsumo(
            keccak256("ID-MS001"),
            "Mascarilla Proteccion Respiratoria",
            0
        );

        vm.stopBroadcast();
    }
}
