// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {HireVault, HireVaultFactory} from "../src/HireVault.sol";
import {Hop, PoolKey, IERC20Min} from "../src/IHireRouter.sol";

contract MockToken {
    string public symbol = "TSLA";
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    function mint(address to, uint256 a) external { balanceOf[to] += a; }
    function approve(address s, uint256 a) external returns (bool) { allowance[msg.sender][s] = a; return true; }
    function transfer(address to, uint256 a) external returns (bool) { balanceOf[msg.sender] -= a; balanceOf[to] += a; return true; }
    function transferFrom(address f, address to, uint256 a) external returns (bool) {
        allowance[f][msg.sender] -= a; balanceOf[f] -= a; balanceOf[to] += a; return true;
    }
}

/// Swaps ETH <-> token at 1 ETH = 10 token.
contract MockRouter {
    MockToken public token;
    constructor(MockToken t) { token = t; }
    receive() external payable {}
    function swapExactInput(Hop[] calldata path, uint256 amountIn, uint256 minOut, address to) external payable returns (uint256 out) {
        address tokenIn = path[0].zeroForOne ? path[0].key.currency0 : path[0].key.currency1;
        if (tokenIn == address(0)) {
            require(msg.value == amountIn, "value");
            out = amountIn * 10;
            token.mint(to, out);
        } else {
            token.transferFrom(msg.sender, address(this), amountIn);
            out = amountIn / 10;
            (bool ok,) = to.call{value: out}("");
            require(ok);
        }
        require(out >= minOut, "slippage");
    }
}

contract HireVaultTest is Test {
    MockToken token;
    MockRouter router;
    HireVaultFactory factory;
    HireVault vault;
    address owner = address(0xA11CE);
    address agent = address(0xA6E47);
    address watchdog = address(0xD06);
    address stranger = address(0xBAD);

    function setUp() public {
        token = new MockToken();
        router = new MockRouter(token);
        vm.deal(address(router), 100 ether);
        factory = new HireVaultFactory(address(router), watchdog);
        vm.prank(owner);
        vault = HireVault(payable(factory.create()));
        vm.deal(owner, 10 ether);
        vm.prank(owner);
        (bool ok,) = address(vault).call{value: 5 ether}("");
        assertTrue(ok);
    }

    function _hire(uint128 maxTrade, uint128 dailyCap) internal {
        address[] memory toks = new address[](1);
        toks[0] = address(token);
        vm.prank(owner);
        vault.hire(agent, maxTrade, dailyCap, 800, toks);
    }

    function _buyPath() internal view returns (Hop[] memory p) {
        p = new Hop[](1);
        p[0] = Hop(PoolKey(address(0), address(token), 3000, 60, address(0)), true);
    }

    function _sellPath() internal view returns (Hop[] memory p) {
        p = new Hop[](1);
        p[0] = Hop(PoolKey(address(0), address(token), 3000, 60, address(0)), false);
    }

    function test_oneVaultPerOwner() public {
        vm.prank(owner);
        vm.expectRevert();
        factory.create();
    }

    function test_agentBuysAndSellsWithinCaps() public {
        _hire(1 ether, 2 ether);
        vm.prank(agent);
        uint256 out = vault.execute(_buyPath(), 1 ether, 9 ether);
        assertEq(out, 10 ether);
        assertEq(token.balanceOf(address(vault)), 10 ether);
        assertEq(address(vault).balance, 4 ether);
        vm.prank(agent);
        vault.execute(_sellPath(), 10 ether, 0);
        assertEq(address(vault).balance, 5 ether);
    }

    function test_tradeTooBig() public {
        _hire(1 ether, 2 ether);
        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(HireVault.TradeTooBig.selector, 2 ether, 1 ether));
        vault.execute(_buyPath(), 2 ether, 0);
    }

    function test_dailyCapResetsAfterADay() public {
        _hire(1 ether, 2 ether);
        vm.startPrank(agent);
        vault.execute(_buyPath(), 1 ether, 0);
        vault.execute(_buyPath(), 1 ether, 0);
        vm.expectRevert(abi.encodeWithSelector(HireVault.DailyCapHit.selector, 3 ether, 2 ether));
        vault.execute(_buyPath(), 1 ether, 0);
        vm.warp(block.timestamp + 1 days);
        vault.execute(_buyPath(), 1 ether, 0);
        vm.stopPrank();
    }

    function test_onlyAllowlistedTokens() public {
        _hire(1 ether, 2 ether);
        Hop[] memory p = new Hop[](1);
        p[0] = Hop(PoolKey(address(0), address(0x1234), 3000, 60, address(0)), true);
        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(HireVault.TokenNotAllowed.selector, address(0x1234)));
        vault.execute(p, 1 ether, 0);
    }

    function test_strangerCannotTradeOrWithdraw() public {
        _hire(1 ether, 2 ether);
        vm.prank(stranger);
        vm.expectRevert(HireVault.NotAgent.selector);
        vault.execute(_buyPath(), 1 ether, 0);
        vm.prank(stranger);
        vm.expectRevert(HireVault.NotOwner.selector);
        vault.withdraw(address(0), 1 ether);
        vm.prank(agent);
        vm.expectRevert(HireVault.NotOwner.selector);
        vault.withdraw(address(0), 1 ether);
    }

    function test_fireByWatchdogRevokesKey() public {
        _hire(1 ether, 2 ether);
        vm.prank(stranger);
        vm.expectRevert(HireVault.NotAllowedToFire.selector);
        vault.fire("nope");
        vm.prank(watchdog);
        vault.fire("down 8.2% from peak");
        vm.prank(agent);
        vm.expectRevert(HireVault.NoActiveJob.selector);
        vault.execute(_buyPath(), 1 ether, 0);
    }

    function test_ownerWithdrawsAnytime() public {
        _hire(1 ether, 2 ether);
        vm.prank(agent);
        vault.execute(_buyPath(), 1 ether, 0);
        vm.startPrank(owner);
        vault.withdraw(address(0), 4 ether);
        vault.withdraw(address(token), 10 ether);
        vm.stopPrank();
        assertEq(owner.balance, 9 ether);
        assertEq(token.balanceOf(owner), 10 ether);
    }

    function test_rehireReplacesAllowlist() public {
        _hire(1 ether, 2 ether);
        address[] memory none = new address[](0);
        vm.prank(owner);
        vault.hire(agent, 1 ether, 2 ether, 500, none);
        assertFalse(vault.allowed(address(token)));
        assertTrue(vault.allowed(address(0)));
    }
}
