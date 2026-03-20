// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/TrazabilidadLogistica.sol";

contract SeedTrazabilidadTemp is Script {
    bytes32 public constant BASE_OPERATIVA_ROLE = keccak256("BASE_OPERATIVA_ROLE");
    bytes32 public constant JEFE_ESCENA_ROLE = keccak256("JEFE_ESCENA_ROLE");
    bytes32 public constant OPERADOR_ROLE = keccak256("OPERADOR_ROLE");

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address contractAddr = vm.envAddress("CONTRACT_ADDRESS");
        TrazabilidadLogistica trazabilidad = TrazabilidadLogistica(payable(contractAddr));

        vm.startBroadcast(deployerPrivateKey);
        address deployer = vm.addr(deployerPrivateKey);

        // Otorgar roles al deployer para la carga inicial
        trazabilidad.grantRole(BASE_OPERATIVA_ROLE, deployer);
        trazabilidad.grantRole(JEFE_ESCENA_ROLE, deployer);

        // 1. Registro de Personal (Maestro)
        address base = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        registrarSiNoExiste(trazabilidad, base, "Alice Liang (Base 1)", "Logistica", BASE_OPERATIVA_ROLE);

        address aura = address(0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65);
        registrarSiNoExiste(trazabilidad, aura, "Aura Frasier (Jefe Escena 2)", "Coordinacion", JEFE_ESCENA_ROLE);

        address tony = address(0x976EA74026E726554dB657fA54763abd0C3a0aa9);
        registrarSiNoExiste(trazabilidad, tony, "Tony Corleone (Jefe Escena 4)", "Coordinacion", JEFE_ESCENA_ROLE);

        address sung = address(0x14dC79964da2C08b23698B3D3cc7Ca32193d9955);
        registrarSiNoExiste(trazabilidad, sung, "Sung Jin-woo (Brigadista 1)", "Combate", OPERADOR_ROLE);

        address akira = address(0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f);
        registrarSiNoExiste(trazabilidad, akira, "Akira Toriyama (Brigadista 2)", "Combate", OPERADOR_ROLE);

        address samantha = address(0xa0Ee7A142d267C1f36714E4a8F75612F20a79720);
        registrarSiNoExiste(trazabilidad, samantha, "Samantha Tan (Brigadista 3)", "Combate", OPERADOR_ROLE);

        address kazuto = address(0xBcd4042DE499D14e55001CcbB24a551F3b954096);
        registrarSiNoExiste(trazabilidad, kazuto, "Kazuto Kirigaya (Brigadista 4)", "Combate", OPERADOR_ROLE);

        address loyd = address(0x71bE63f3384f5fb98995898A86B02Fb2426c5788);
        registrarSiNoExiste(trazabilidad, loyd, "Loyd Forger (Brigadista 5)", "Combate", OPERADOR_ROLE);

        // 2. Registro Masivo de Insumos (9 x Categoria | Excepciones: 10 y 12)
        uint256 totalItems = 157;
        bytes32[] memory c = new bytes32[](totalItems);
        string[] memory d = new string[](totalItems);
        uint256[] memory cons = new uint256[](totalItems);
        uint256 currentIdx = 0;

        currentIdx = fill(c, d, cons, currentIdx, "ID-HZ", "Herramienta de Zapa (Raspado)", 9, 0);
        currentIdx = fill(c, d, cons, currentIdx, "ID-MA", "Machete de corte denso", 9, 0);
        currentIdx = fill(c, d, cons, currentIdx, "ID-PL", "Herramienta Pulaski (Hacha/Azadon)", 9, 0);
        currentIdx = fill(c, d, cons, currentIdx, "ID-MC", "Rastrillo McLeod (Suelo Mineral)", 9, 0);
        currentIdx = fill(c, d, cons, currentIdx, "ID-PA", "Pala (Control de puntos calientes)", 9, 0);
        currentIdx = fill(c, d, cons, currentIdx, "ID-MB", "Motobomba Portatil Waterax Mark-3", 9, 4000);
        currentIdx = fill(c, d, cons, currentIdx, "ID-MG", "Tramo de Manguera de Incendio 1.5 pulg", 9, 0);
        currentIdx = fill(c, d, cons, currentIdx, "ID-MX", "Mochila de Agua (Bomba de Espalda 20L)", 9, 0);
        currentIdx = fill(c, d, cons, currentIdx, "ID-V4", "Vehiculo 4x4 Transporte Brigada", 9, 10000);
        currentIdx = fill(c, d, cons, currentIdx, "ID-AM", "Ambulancia Soporte Vital", 9, 8000);
        currentIdx = fill(c, d, cons, currentIdx, "ID-TC", "Vehiculo Cisterna (Tanquero) 2000G", 9, 15000);
        currentIdx = fill(c, d, cons, currentIdx, "ID-GP", "GPS Garmin (Georreferenciacion)", 9, 0);
        currentIdx = fill(c, d, cons, currentIdx, "ID-CS", "Casco de Proteccion Forestal", 9, 0);
        currentIdx = fill(c, d, cons, currentIdx, "ID-GT", "Guantes de Cuero Termicos", 9, 0);
        currentIdx = fill(c, d, cons, currentIdx, "ID-BT", "Botas de Combate Forestal", 9, 0);
        
        // Excepciones
        currentIdx = fill(c, d, cons, currentIdx, "ID-BF", "Batefuego Forestal (Sofocacion)", 10, 0);
        currentIdx = fill(c, d, cons, currentIdx, "ID-RD", "Radio Portatil Motorola", 12, 0);

        // Procesar en lotes de 40 para evitar límites de gas
        uint256 batchSize = 40;
        for (uint256 i = 0; i < totalItems; i += batchSize) {
            uint256 end = i + batchSize;
            if (end > totalItems) end = totalItems;
            
            uint256 size = end - i;
            bytes32[] memory batchC = new bytes32[](size);
            string[] memory batchD = new string[](size);
            uint256[] memory batchCons = new uint256[](size);
            
            for (uint256 j = 0; j < size; j++) {
                batchC[j] = c[i + j];
                batchD[j] = d[i + j];
                batchCons[j] = cons[i + j];
            }
            trazabilidad.registrarInsumosBatch(batchC, batchD, batchCons);
        }

        // 3. Restauración de Incidentes Históricos
        trazabilidad.abrirEventoIncendio("-2.844601381974763, -79.14259204047238", 3);
        trazabilidad.abrirEventoIncendio("-0.180646, -78.377657", 2);

        vm.stopBroadcast();
    }

    function fill(bytes32[] memory c, string[] memory d, uint256[] memory cons, uint256 start, string memory pref, string memory desc, uint256 count, uint256 flow) internal pure returns (uint256) {
        for (uint256 i = 0; i < count; i++) {
            uint256 n = i + 1;
            string memory id = string.concat(pref, n < 10 ? "00" : "0", vm.toString(n));
            c[start + i] = keccak256(abi.encodePacked(id));
            d[start + i] = string.concat(id, " | ", desc);
            cons[start + i] = flow;
        }
        return start + count;
    }

    function registrarSiNoExiste(TrazabilidadLogistica t, address a, string memory n, string memory e, bytes32 r) internal {
        (address wallet, , , bool activo) = t.brigadistas(a);
        if (!activo) {
            t.registrarPersonal(a, n, e, r);
        }
    }
}
