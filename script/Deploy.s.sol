// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/TrazabilidadLogistica.sol";

contract DeployTrazabilidad is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        new TrazabilidadLogistica();

        vm.stopBroadcast();
    }
}
