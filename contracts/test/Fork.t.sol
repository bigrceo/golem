// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {HireVault, HireVaultFactory} from "../src/HireVault.sol";
import {Hop, PoolKey, IERC20Min} from "../src/IHireRouter.sol";

/// Real KaratRouter, real ETH/TSLA v4 pool on Robinhood Chain (chainId 4663).
contract ForkTest is Test {
    address constant ROUTER = 0x5b03CA37137FEb729a9E4427c5683998b4aB09e3;
    address constant TSLA = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d;

    function test_fork_buyAndSellTsla() public {
        if (block.chainid != 4663) return;
        address owner = address(0xA11CE);
        address agent = address(0xA6E47);
        HireVaultFactory f = new HireVaultFactory(ROUTER, address(this));
        vm.prank(owner);
        HireVault v = HireVault(payable(f.create()));
        vm.deal(owner, 1 ether);
        vm.prank(owner);
        (bool ok,) = address(v).call{value: 0.05 ether}("");
        assertTrue(ok);
        address[] memory toks = new address[](1);
        toks[0] = TSLA;
        vm.prank(owner);
        v.hire(agent, 0.02 ether, 0.04 ether, 800, toks);

        Hop[] memory buy = new Hop[](1);
        buy[0] = Hop(PoolKey(address(0), TSLA, 50000, 1000, address(0)), true);
        vm.prank(agent);
        uint256 got = v.execute(buy, 0.01 ether, 0);
        emit log_named_uint("TSLA received (1e18)", got);
        assertGt(got, 0);
        assertEq(IERC20Min(TSLA).balanceOf(address(v)), got);

        Hop[] memory sell = new Hop[](1);
        sell[0] = Hop(PoolKey(address(0), TSLA, 50000, 1000, address(0)), false);
        vm.prank(agent);
        uint256 back = v.execute(sell, got, 0);
        emit log_named_uint("ETH back (wei)", back);
        assertGt(back, 0.008 ether);
    }
}
