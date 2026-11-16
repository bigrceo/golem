// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {HireVaultFactory} from "../src/HireVault.sol";

/// forge script script/Deploy.s.sol --rpc-url robinhood --broadcast --private-key $PK
contract Deploy is Script {
    function run() external {
        address router = vm.envOr("ROUTER", address(0x5b03CA37137FEb729a9E4427c5683998b4aB09e3));
        address watchdog = vm.envAddress("WATCHDOG");
        vm.startBroadcast();
        HireVaultFactory f = new HireVaultFactory(router, watchdog);
        vm.stopBroadcast();
        console.log("HireVaultFactory", address(f));
    }
}
