// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// ABI-compatible mirror of KaratRouter's types (Uniswap v4 PoolKey + Hop).
struct PoolKey {
    address currency0;
    address currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

struct Hop {
    PoolKey key;
    bool zeroForOne;
}

interface IHireRouter {
    function swapExactInput(Hop[] calldata path, uint256 amountIn, uint256 minOut, address to)
        external
        payable
        returns (uint256 amountOut);
}

interface IERC20Min {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
}
