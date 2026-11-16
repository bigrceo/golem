// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IHireRouter, Hop, IERC20Min} from "./IHireRouter.sol";

/// @title HireVault — a vault only its owner can open, that one hired agent may trade from.
/// @notice The owner deposits ETH (and tokens). They hire an agent key with hard caps:
///         max size per trade, daily budget, an allowlist of tokens, and a firing line.
///         The agent can only swap allowlisted tokens through the router, back into this vault.
///         It can never move funds out. The owner, the watchdog (HIRE keeper) or the agent
///         itself can fire the agent; firing revokes the key on the spot.
contract HireVault {
    address public immutable owner;
    address public immutable factory;
    IHireRouter public immutable router;

    struct Job {
        address agent;
        bool active;
        uint16 fireBps; // drawdown line, informative on-chain, enforced by the watchdog
        uint64 hiredAt;
        uint64 dayStart;
        uint128 maxTrade; // wei of ETH per buy
        uint128 dailyCap; // wei of ETH per 24h of buys
        uint128 spentToday;
    }

    Job public job;
    mapping(address => bool) public allowed;
    address[] private _allowedList;

    uint256 private _lock = 1;

    event Deposited(address indexed from, address indexed token, uint256 amount);
    event Withdrawn(address indexed token, uint256 amount);
    event Hired(address indexed agent, uint128 maxTrade, uint128 dailyCap, uint16 fireBps, address[] tokens);
    event Fired(address indexed agent, address indexed by, string reason);
    event Executed(address indexed agent, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    error NotOwner();
    error NotAgent();
    error NotAllowedToFire();
    error NoActiveJob();
    error TokenNotAllowed(address token);
    error TradeTooBig(uint256 amount, uint256 max);
    error DailyCapHit(uint256 spent, uint256 cap);
    error Reentrancy();
    error ZeroAddress();
    error EmptyPath();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    constructor(address _owner, address _router) {
        if (_owner == address(0) || _router == address(0)) revert ZeroAddress();
        owner = _owner;
        router = IHireRouter(_router);
        factory = msg.sender;
    }

    receive() external payable {
        emit Deposited(msg.sender, address(0), msg.value);
    }

    function depositToken(address token, uint256 amount) external {
        if (!IERC20Min(token).transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        emit Deposited(msg.sender, token, amount);
    }

    // ---------------------------------------------------------------- owner

    /// @notice Hire an agent key. Replaces any previous job.
    function hire(address agent, uint128 maxTrade, uint128 dailyCap, uint16 fireBps, address[] calldata tokens)
        external
        onlyOwner
    {
        if (agent == address(0)) revert ZeroAddress();
        for (uint256 i; i < _allowedList.length; ++i) allowed[_allowedList[i]] = false;
        delete _allowedList;
        allowed[address(0)] = true; // ETH is always the base
        _allowedList.push(address(0));
        for (uint256 i; i < tokens.length; ++i) {
            allowed[tokens[i]] = true;
            _allowedList.push(tokens[i]);
        }
        job = Job({
            agent: agent,
            active: true,
            fireBps: fireBps,
            hiredAt: uint64(block.timestamp),
            dayStart: uint64(block.timestamp),
            maxTrade: maxTrade,
            dailyCap: dailyCap,
            spentToday: 0
        });
        emit Hired(agent, maxTrade, dailyCap, fireBps, tokens);
    }

    /// @notice Revoke the agent. Owner, watchdog and the agent itself may call it.
    function fire(string calldata reason) external {
        Job memory j = job;
        if (!j.active) revert NoActiveJob();
        if (msg.sender != owner && msg.sender != j.agent && msg.sender != HireVaultFactory(factory).watchdog()) {
            revert NotAllowedToFire();
        }
        job.active = false;
        emit Fired(j.agent, msg.sender, reason);
    }

    /// @notice Only to the owner. Works with or without an active job.
    function withdraw(address token, uint256 amount) external onlyOwner nonReentrant {
        if (token == address(0)) {
            (bool ok,) = owner.call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            if (!IERC20Min(token).transfer(owner, amount)) revert TransferFailed();
        }
        emit Withdrawn(token, amount);
    }

    // ---------------------------------------------------------------- agent

    /// @notice Swap through the router. Input and output must be allowlisted; buys (ETH in)
    ///         are capped per trade and per day; output always lands in this vault.
    function execute(Hop[] calldata path, uint256 amountIn, uint256 minOut)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        Job memory j = job;
        if (!j.active) revert NoActiveJob();
        if (msg.sender != j.agent) revert NotAgent();
        if (path.length == 0) revert EmptyPath();

        address tokenIn = path[0].zeroForOne ? path[0].key.currency0 : path[0].key.currency1;
        Hop calldata last = path[path.length - 1];
        address tokenOut = last.zeroForOne ? last.key.currency1 : last.key.currency0;
        if (!allowed[tokenIn]) revert TokenNotAllowed(tokenIn);
        if (!allowed[tokenOut]) revert TokenNotAllowed(tokenOut);

        if (tokenIn == address(0)) {
            if (amountIn > j.maxTrade) revert TradeTooBig(amountIn, j.maxTrade);
            if (block.timestamp >= j.dayStart + 1 days) {
                job.dayStart = uint64(block.timestamp);
                job.spentToday = 0;
                j.spentToday = 0;
            }
            if (j.spentToday + amountIn > j.dailyCap) revert DailyCapHit(j.spentToday + amountIn, j.dailyCap);
            job.spentToday = uint128(j.spentToday + amountIn);
            amountOut = router.swapExactInput{value: amountIn}(path, amountIn, minOut, address(this));
        } else {
            IERC20Min(tokenIn).approve(address(router), amountIn);
            amountOut = router.swapExactInput(path, amountIn, minOut, address(this));
        }
        emit Executed(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    // ---------------------------------------------------------------- views

    function allowedTokens() external view returns (address[] memory) {
        return _allowedList;
    }
}

/// @title HireVaultFactory — one vault per owner, and the watchdog address that may fire agents.
contract HireVaultFactory {
    address public immutable router;
    address public admin;
    address public watchdog;
    mapping(address => address) public vaultOf;
    address[] public vaults;

    event VaultCreated(address indexed owner, address vault);
    event WatchdogSet(address watchdog);

    error NotAdmin();
    error AlreadyHasVault(address vault);
    error ZeroAddress();

    constructor(address _router, address _watchdog) {
        if (_router == address(0)) revert ZeroAddress();
        router = _router;
        admin = msg.sender;
        watchdog = _watchdog;
    }

    function create() external returns (address vault) {
        if (vaultOf[msg.sender] != address(0)) revert AlreadyHasVault(vaultOf[msg.sender]);
        vault = address(new HireVault(msg.sender, router));
        vaultOf[msg.sender] = vault;
        vaults.push(vault);
        emit VaultCreated(msg.sender, vault);
    }

    function setWatchdog(address w) external {
        if (msg.sender != admin) revert NotAdmin();
        watchdog = w;
        emit WatchdogSet(w);
    }

    function count() external view returns (uint256) {
        return vaults.length;
    }
}
