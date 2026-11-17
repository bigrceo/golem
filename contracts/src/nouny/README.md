# NOUNY AgentVault (vendored)

`AgentVault.sol` and `AgentVaultFactory.sol` are copied unchanged from
https://github.com/nounyagent/nouny-agent (MIT, see `LICENSE-NOUNY`), the contracts behind
nounyagent.com on Robinhood Chain (factory `0x842dB2d736F66A0132EaB3816C426Bc21bb746Ec`).

What hire takes from them: a per-wallet vault whose bot can only swap inside it, with the
minimum output computed on-chain from Chainlink (stale prices rejected), a pinned Uniswap V3
pool per token, a USD cap per 24 h, and owner-only withdrawals even while paused.

What hire adds in `../HireVault.sol`: a firing line (owner, watchdog or agent can revoke the
key, with the reason on-chain), a per-trade cap, a token allowlist set at hire time, and
routing through any Uniswap v4 pool via the Karat router, so agents can trade Robinhood
Chain tokens that have no Chainlink feed.

Not deployed by hire: deployment needs gas, and hire runs in paper mode.
