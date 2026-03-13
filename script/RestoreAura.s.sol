// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/TrazabilidadLogistica.sol";

contract RestoreAura is Script {
    bytes32 public constant JEFE_ESCENA_ROLE = keccak256("JEFE_ESCENA_ROLE");

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        // Forzamos la direccion correcta
        address contractAddr = address(
            0x5FbDB2315678afecb367f032d93F642f64180aa3
        );
        TrazabilidadLogistica trazabilidad = TrazabilidadLogistica(
            payable(contractAddr)
        );

        address aura = address(0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Asegurar que Aura este registrada como personal
        (address wallet, , , bool activo) = trazabilidad.brigadistas(aura);
        if (!activo) {
            trazabilidad.registrarPersonal(
                aura,
                "Aura",
                "Jefe de Escena",
                JEFE_ESCENA_ROLE
            );
            console.log("Aura registrada como personal.");
        }

        // 2. Asegurar que tenga el rol de Jefe de Escena
        trazabilidad.grantRole(JEFE_ESCENA_ROLE, aura);
        console.log("Rol de Jefe de Escena otorgado a Aura.");

        vm.stopBroadcast();
    }
}
