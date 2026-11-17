/**
 * hire-api: the floor. Discovers Robinhood Chain pools from the Uniswap v4 PoolManager,
 * prices them with DexScreener, runs the Gate, lets trench agents call tokens with receipts,
 * closes calls on their rules and fires agents that cross their line. Cron every 5 minutes.
 */
export interface Env { DB: D1Database; RPC: string; SECRET: string; WEB: string; SNAP: KVNamespace }

const PM = "0x8366a39CC670B4001A1121B8F6A443A643e40951";
const INIT = "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438";
const BASES = new Set(["0x0000000000000000000000000000000000000000", "0x0bd7d308f8e1639fab988df18a8011f41eacad73", "0x5fc5360d0400a0fd4f2af552add042d716f1d168"]);
const STOCKS = new Set(["0xaf3d76f1834a1d425780943c99ea8a608f8a93f9", "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec", "0x322f0929c4625ed5bad873c95208d54e1c003b2d", "0xe93237c50d904957cf27e7b1133b510c669c2e74", "0x2e0847e8910a9732eb3fb1bb4b70a580adad4fe3", "0x12f190a9f9d7d37a250758b26824b97ce941bf54", "0xc0d6457c16cc70d6790dd43521c899c87ce02f35", "0x6330d8c3178a418788df01a47479c0ce7ccf450b", "0x117cc2133c37b721f49de2a7a74833232b3b4c0c", "0xd5f3879160bc7c32ebb4dc785f8a4f505888de68", "0x80e0e24718dbfcad49ecaa6f1e6c89a190586ca8", "0xcec185eb182c47d1ba1efc84e6959e18cd620be4"]);
const H = 3600_000;
const RESERVED = new Set(["USDG", "USDC", "USDT", "WETH", "ETH", "WBTC", "CBBTC", "TSLA", "NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "COIN", "SPY", "QQQ", "HOOD"]);
const CALL_SIZE = 1000; // paper USDG per call, out of a 10,000 vault

export type Trench = {
  universe: "trenches"; side: "bull" | "bear";
  maxAgeH: number; minLiq: number; minFdv: number; maxFdv: number; minBuysH1: number; minBuyRatio: number;
  minChH1: number; maxChH1: number; minChM5: number; copycatsOnly?: boolean; failedGateOnly?: boolean;
  tp: number; sl: number; maxHold: number; fireLine: number;
};

export const HOUSE: { slug: string; name: string; spec: Trench; bio: string }[] = [
  { slug: "scout", name: "Scout", bio: "Calls bullish on tokens up to 72h old that pass the Gate, with $5K+ liquidity, $10K–$500K FDV and more buyers than sellers this hour.",
    spec: { universe: "trenches", side: "bull", maxAgeH: 72, minLiq: 5000, minFdv: 10000, maxFdv: 500000, minBuysH1: 15, minBuyRatio: 1.1, minChH1: 0, maxChH1: 150, minChM5: -100, tp: 60, sl: 30, maxHold: 24, fireLine: 25 } },
  { slug: "grad", name: "Grad", bio: "Calls bullish on fresh pools under 6h old above $15K FDV with 30+ buys this hour and positive 5-minute momentum.",
    spec: { universe: "trenches", side: "bull", maxAgeH: 6, minLiq: 4000, minFdv: 15000, maxFdv: 2000000, minBuysH1: 30, minBuyRatio: 1, minChH1: -100, maxChH1: 400, minChM5: 0.1, tp: 40, sl: 25, maxHold: 6, fireLine: 25 } },
  { slug: "skeptic", name: "Skeptic", bio: "Calls bearish on copycat tickers: a token whose symbol already exists with a bigger FDV.",
    spec: { universe: "trenches", side: "bear", maxAgeH: 72, minLiq: 1000, minFdv: 5000, maxFdv: 5000000, minBuysH1: 0, minBuyRatio: 0, minChH1: -100, maxChH1: 10000, minChM5: -100, copycatsOnly: true, tp: 40, sl: 30, maxHold: 24, fireLine: 30 } },
];

// ------------------------------------------------------------------ helpers
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "no-store" } });
const RPCS = ["https://rpc.mainnet.chain.robinhood.com", "https://rpc.mainnet.chain.robinhood.com", "https://rpc.mainnet.chain.robinhood.com"];
async function rpc(_env: Env, method: string, params: unknown[]) {
  let last = "";
  for (const [i, u] of RPCS.entries()) {
    if (i) await new Promise((r) => setTimeout(r, 1500 * i));
    try {
      const r = await fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
      if (!r.ok) { last += ` | ${u} ${r.status} ${(await r.text()).slice(0, 120)}`; continue; }
      const j = (await r.json()) as { result?: unknown; error?: { message: string } }; if (j.error) { last += ` | ${u} ${j.error.message}`; continue; } return j.result;
    } catch (e) { last += ` | ${u} ${String(e)}`; }
  }
  throw new Error(last);
}
const addr = (topic: string) => ("0x" + topic.slice(26)).toLowerCase();
async function meta(env: Env, k: string) { return (await env.DB.prepare("select v from meta where k = ?").bind(k).first<{ v: string }>())?.v ?? null; }
async function setMeta(env: Env, k: string, v: string) { await env.DB.prepare("insert into meta (k, v) values (?, ?) on conflict(k) do update set v = excluded.v").bind(k, v).run(); }

type Tok = { token: string; pair: string; symbol: string; name: string; created: number; first_seen: number; last_seen: number; price: number; fdv: number; liq: number; buys_h1: number; sells_h1: number; ch_m5: number; ch_h1: number; ch_h24: number; vol_h24: number; image: string | null; passed: number; gate: string };

// ------------------------------------------------------------------ discovery
async function discover(env: Env) {
  const from = await meta(env, "block");
  const r = await fetch(`${env.WEB}/api/discover${from ? `?from=${from}` : ""}`, { headers: { "x-hire-secret": env.SECRET } });
  if (!r.ok) throw new Error(`discover ${r.status} ${(await r.text()).slice(0, 120)}`);
  const d = (await r.json()) as { head: number; next: number; tokens: string[] };
  const found = d.tokens.filter((t) => !STOCKS.has(t));
  const now = Date.now();
  if (found.length) {
    const stmts = found.map((t) => env.DB.prepare("insert into tokens (token, first_seen, last_seen) values (?, ?, ?) on conflict(token) do nothing").bind(t, now, now));
    for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  }
  await setMeta(env, "block", String(d.next));
  return { head: d.head, found: found.length };
}

// ------------------------------------------------------------------ prices + gate
type DsPair = { pairAddress: string; baseToken: { address: string; symbol: string; name: string }; priceUsd?: string; fdv?: number; liquidity?: { usd?: number }; txns?: { h1?: { buys: number; sells: number } }; priceChange?: { m5?: number; h1?: number; h24?: number }; volume?: { h24?: number }; pairCreatedAt?: number; info?: { imageUrl?: string } };
async function refresh(env: Env) {
  const now = Date.now();
  // tracked = seen in the last 72h, or with an open call
  // active set every run, the long tail in rotation
  const active = (await env.DB.prepare("select token from tokens where (liq >= 1000 and created > ?) or token in (select token from calls where closed_at is null) order by vol_h24 desc limit 150").bind(now - 72 * H).all<{ token: string }>()).results.map((r) => r.token);
  const tail = (await env.DB.prepare("select token from tokens where (liq is null or liq < 1000) and first_seen > ? order by last_seen asc limit 150").bind(now - 96 * H).all<{ token: string }>()).results.map((r) => r.token);
  const list = [...new Set([...active, ...tail])];
  if (tail.length) { const st = tail.map((t) => env.DB.prepare("update tokens set last_seen = ? where token = ?").bind(now, t)); for (let i = 0; i < st.length; i += 50) await env.DB.batch(st.slice(i, i + 50)); }
  const best = new Map<string, DsPair>();
  for (let i = 0; i < list.length; i += 30) {
    const r = await fetch(`https://api.dexscreener.com/tokens/v1/robinhood/${list.slice(i, i + 30).join(",")}`);
    if (!r.ok) continue;
    const pairs = (await r.json()) as DsPair[];
    for (const p of pairs) { const k = p.baseToken.address.toLowerCase(); const cur = best.get(k); if (!cur || (p.liquidity?.usd ?? 0) > (cur.liquidity?.usd ?? 0)) best.set(k, p); }
  }
  const toks: Tok[] = [];
  for (const [k, p] of best) toks.push({ token: k, pair: p.pairAddress, symbol: p.baseToken.symbol, name: p.baseToken.name, created: p.pairCreatedAt ?? now, first_seen: now, last_seen: now, price: +(p.priceUsd ?? 0), fdv: p.fdv ?? 0, liq: p.liquidity?.usd ?? 0, buys_h1: p.txns?.h1?.buys ?? 0, sells_h1: p.txns?.h1?.sells ?? 0, ch_m5: p.priceChange?.m5 ?? 0, ch_h1: p.priceChange?.h1 ?? 0, ch_h24: p.priceChange?.h24 ?? 0, vol_h24: p.volume?.h24 ?? 0, image: p.info?.imageUrl ?? null, passed: 0, gate: "" });
  // biggest FDV per symbol, for copycat detection
  const bigBySymbol = new Map<string, number>();
  for (const t of toks) { const s = t.symbol.toUpperCase(); bigBySymbol.set(s, Math.max(bigBySymbol.get(s) ?? 0, t.fdv)); }
  for (const t of toks) { const g = gate(t, bigBySymbol, now); t.passed = g.passed ? 1 : 0; t.gate = JSON.stringify(g.checks); }
  const stmts = toks.map((t) => env.DB.prepare(`update tokens set pair=?, symbol=?, name=?, created=?, last_seen=?, price=?, fdv=?, liq=?, buys_h1=?, sells_h1=?, ch_m5=?, ch_h1=?, ch_h24=?, vol_h24=?, image=?, passed=?, gate=? where token=?`)
    .bind(t.pair, t.symbol, t.name, t.created, t.last_seen, t.price, t.fdv, t.liq, t.buys_h1, t.sells_h1, t.ch_m5, t.ch_h1, t.ch_h24, t.vol_h24, t.image, t.passed, t.gate, t.token));
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  return { tracked: list.length, priced: toks.length, bigBySymbol, toks };
}

export type Check = { name: string; ok: boolean; detail: string };
function gate(t: Tok, big: Map<string, number>, now: number): { passed: boolean; checks: Check[] } {
  const ageMin = (now - t.created) / 60000;
  const copy = (big.get(t.symbol.toUpperCase()) ?? 0) > t.fdv * 1.5;
  const ratio = t.sells_h1 ? t.buys_h1 / t.sells_h1 : t.buys_h1 ? Infinity : 0;
  const checks: Check[] = [
    { name: "Liquidity", ok: t.liq >= 3000, detail: `$${Math.round(t.liq).toLocaleString("en-US")} in the pool, needs $3,000` },
    { name: "Depth", ok: t.fdv > 0 && t.liq / t.fdv >= 0.05, detail: `pool holds ${t.fdv ? ((t.liq / t.fdv) * 100).toFixed(1) : 0}% of FDV, needs 5%` },
    { name: "Sellable", ok: t.sells_h1 > 0, detail: `${t.sells_h1} sells this hour` },
    { name: "Organic", ok: ratio <= 20, detail: ratio === Infinity ? "only buys, no sells" : `${ratio.toFixed(1)} buys per sell` },
    { name: "Original", ok: !copy, detail: copy ? `a bigger $${t.symbol} exists` : "biggest token with this ticker" },
    { name: "Settled", ok: ageMin >= 10, detail: `${ageMin < 60 ? Math.round(ageMin) + " min" : (ageMin / 60).toFixed(1) + " h"} old, needs 10 min` },
    { name: "Not late", ok: t.ch_h1 <= 500, detail: `${t.ch_h1 >= 0 ? "+" : ""}${t.ch_h1}% this hour, refuses above +500%` },
  ];
  return { passed: checks.every((c) => c.ok), checks };
}

// ------------------------------------------------------------------ agents
type AgentRow = { slug: string; name: string; kind: string; spec: string; fired_at: number | null; created_at: number };
async function runAgents(env: Env, toks: Tok[], big: Map<string, number>) {
  const now = Date.now();
  const byToken = new Map(toks.map((t) => [t.token, t]));
  const agents = (await env.DB.prepare("select slug, name, kind, spec, fired_at, created_at from agents where kind = 'trench' and fired_at is null").all<AgentRow>()).results;
  const open = (await env.DB.prepare("select * from calls where closed_at is null").all<CallRow>()).results;
  const stmts: D1PreparedStatement[] = [];
  // close calls
  for (const c of open) {
    const a = agents.find((x) => x.slug === c.agent); const t = byToken.get(c.token); if (!t || !t.price) continue;
    const s = a ? (JSON.parse(a.spec) as Trench) : null; const pnl = callPnl(c, t.price);
    let why: string | null = null;
    if (!a) why = "agent fired";
    else if (pnl >= s!.tp) why = `take profit +${s!.tp}%`;
    else if (pnl <= -s!.sl) why = `stop -${s!.sl}%`;
    else if (now - c.t >= s!.maxHold * H) why = `held ${s!.maxHold}h, time stop`;
    if (why) stmts.push(env.DB.prepare("update calls set closed_at=?, exit_price=?, exit_reason=? where id=?").bind(now, t.price, why, c.id));
  }
  // new calls
  const recent = (await env.DB.prepare("select agent, token from calls where t > ?").bind(now - 24 * H).all<{ agent: string; token: string }>()).results;
  const called = new Set(recent.map((r) => r.agent + ":" + r.token));
  for (const a of agents) {
    const s = JSON.parse(a.spec) as Trench & { copy?: { wallet: string; from?: number } }; let made = 0;
    if (s.copy) {
      // copy agent: call what the wallet just bought, if it passes the Gate
      const r = await fetch(`${env.WEB}/api/wallet-buys?w=${s.copy.wallet}${s.copy.from ? `&from=${s.copy.from}` : ""}`, { headers: { "x-hire-secret": env.SECRET } }).then((x) => (x.ok ? x.json() : null)).catch(() => null) as { next: number; tokens: string[] } | null;
      if (!r) continue;
      stmts.push(env.DB.prepare("update agents set spec=? where slug=?").bind(JSON.stringify({ ...s, copy: { ...s.copy, from: r.next } }), a.slug));
      for (const tok of r.tokens) {
        const t = byToken.get(tok); if (!t || !t.price || called.has(a.slug + ":" + tok)) continue;
        called.add(a.slug + ":" + tok);
        if (!t.passed) { stmts.push(env.DB.prepare("insert into checks (agent, token, symbol, t, passed, reason) values (?, ?, ?, ?, 0, ?)").bind(a.slug, tok, t.symbol, now, "Wallet bought it, Gate held it back")); continue; }
        const reason = `Copied: the wallet just bought $${t.symbol}. Gate passed, $${short(t.fdv)} FDV, $${short(t.liq)} liquidity.`;
        stmts.push(env.DB.prepare("insert into calls (agent, token, symbol, side, entry_price, entry_fdv, t, reason) values (?, ?, ?, 'bull', ?, ?, ?, ?)").bind(a.slug, tok, t.symbol, t.price, t.fdv, now, reason));
        stmts.push(env.DB.prepare("insert into checks (agent, token, symbol, t, passed, reason) values (?, ?, ?, ?, 1, ?)").bind(a.slug, tok, t.symbol, now, reason));
      }
      continue;
    }
    const cands = toks.filter((t) => t.price > 0 && t.created >= now - s.maxAgeH * H && t.liq >= s.minLiq && t.fdv >= s.minFdv && t.fdv <= s.maxFdv && t.buys_h1 >= s.minBuysH1
      && (t.sells_h1 ? t.buys_h1 / t.sells_h1 : t.buys_h1) >= s.minBuyRatio && t.ch_h1 >= s.minChH1 && t.ch_h1 <= s.maxChH1 && t.ch_m5 >= s.minChM5)
      .sort((x, y) => y.vol_h24 - x.vol_h24);
    for (const t of cands) {
      if (made >= 2 || called.has(a.slug + ":" + t.token)) continue;
      const checks = JSON.parse(t.gate || "[]") as Check[];
      const copy = (big.get(t.symbol.toUpperCase()) ?? 0) > t.fdv * 1.5;
      if (s.side === "bull") {
        if (!t.passed) { const bad = checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.detail}`).join("; "); stmts.push(env.DB.prepare("insert into checks (agent, token, symbol, t, passed, reason) values (?, ?, ?, ?, 0, ?)").bind(a.slug, t.token, t.symbol, now, bad)); called.add(a.slug + ":" + t.token); continue; }
      } else if (s.copycatsOnly && (!copy || RESERVED.has(t.symbol.toUpperCase()))) continue;
      const reason = s.side === "bull"
        ? `Gate passed. $${short(t.fdv)} FDV, $${short(t.liq)} liquidity, ${t.buys_h1} buys / ${t.sells_h1} sells this hour, ${sign(t.ch_h1)}% 1h.`
        : `Copycat: a bigger $${t.symbol} exists ($${short(big.get(t.symbol.toUpperCase()) ?? 0)} vs $${short(t.fdv)}).`;
      stmts.push(env.DB.prepare("insert into calls (agent, token, symbol, side, entry_price, entry_fdv, t, reason) values (?, ?, ?, ?, ?, ?, ?, ?)").bind(a.slug, t.token, t.symbol, s.side, t.price, t.fdv, now, reason));
      stmts.push(env.DB.prepare("insert into checks (agent, token, symbol, t, passed, reason) values (?, ?, ?, ?, 1, ?)").bind(a.slug, t.token, t.symbol, now, reason));
      called.add(a.slug + ":" + t.token); made++;
    }
  }
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  // firing line on paper equity
  const fired: string[] = [];
  for (const a of agents) {
    const st = await agentStats(env, a.slug, byToken);
    const s = JSON.parse(a.spec) as Trench;
    if (st.drawdown >= s.fireLine) { await env.DB.prepare("update agents set fired_at=?, fire_reason=? where slug=?").bind(now, `paper vault down ${st.drawdown.toFixed(1)}% from peak, line ${s.fireLine}%`, a.slug).run(); fired.push(a.slug); }
  }
  return { agents: agents.length, closedOrOpened: stmts.length, fired };
}

type CallRow = { id: number; agent: string; token: string; symbol: string; side: string; entry_price: number; entry_fdv: number; t: number; reason: string; closed_at: number | null; exit_price: number | null; exit_reason: string | null };
const callPnl = (c: CallRow, price: number) => { const m = (price / c.entry_price - 1) * 100; return c.side === "bear" ? -m : m; };
const short = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : Math.round(n).toString());
const sign = (n: number) => (n >= 0 ? "+" : "") + n;

async function agentStats(env: Env, slug: string, prices?: Map<string, Tok>) {
  const calls = (await env.DB.prepare("select c.*, t.price as now_price from calls c left join tokens t on t.token = c.token where c.agent = ? order by c.t asc").bind(slug).all<CallRow & { now_price: number | null }>()).results;
  let eq = 10_000, peak = 10_000, dd = 0, hits = 0, sum = 0;
  const out = calls.map((c) => {
    const price = c.closed_at ? c.exit_price! : prices?.get(c.token)?.price ?? c.now_price ?? c.entry_price;
    const pnl = callPnl(c, price); eq += (CALL_SIZE * pnl) / 100; peak = Math.max(peak, eq); dd = Math.max(dd, (1 - eq / peak) * 100);
    if (pnl > 0) hits++; sum += pnl;
    return { ...c, pnl: Math.round(pnl * 10) / 10, price };
  });
  return { calls: out.reverse(), count: calls.length, hit: calls.length ? Math.round((hits / calls.length) * 100) : 0, avg: calls.length ? Math.round((sum / calls.length) * 10) / 10 : 0, equity: Math.round(eq), drawdown: dd };
}

// ------------------------------------------------------------------ http
async function seedHouse(env: Env) {
  const now = Date.now();
  await env.DB.batch(HOUSE.map((h) => env.DB.prepare("insert into agents (slug, name, kind, spec, owner, created_at, house) values (?, ?, 'trench', ?, 'hire', ?, 1) on conflict(slug) do update set spec = excluded.spec, name = excluded.name").bind(h.slug, h.name, JSON.stringify({ ...h.spec, bio: h.bio }), now)));
}

const SLUG = /^[a-z0-9][a-z0-9-]{1,23}$/;
async function handle(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url); const p = url.pathname;
  if (req.method === "OPTIONS") return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, x-hire-secret", "access-control-allow-methods": "GET, POST" } });
  if (p === "/" || p === "/health") return json({ ok: true, block: await meta(env, "block"), lastRun: await meta(env, "lastRun") });

  if (p === "/floor" && !url.searchParams.has("fresh")) { const v = await env.SNAP.get("floor"); if (v) return new Response(v, { headers: { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "public, max-age=60" } }); }
  if (p === "/agents" && req.method === "GET" && !url.searchParams.has("fresh")) { const v = await env.SNAP.get("agents"); if (v) return new Response(JSON.stringify({ agents: (JSON.parse(v) as { agents: unknown[] }).agents }), { headers: { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "public, max-age=60" } }); }
  { const mm = p.match(/^\/agents\/([a-z0-9-]+)$/); if (mm && req.method === "GET" && !url.searchParams.has("fresh")) { const v = await env.SNAP.get("agents"); if (v) { const d = (JSON.parse(v) as { detail: Record<string, unknown> }).detail[mm[1]]; if (d) return json(d); } } }
  if (p === "/floor") {
    const now = Date.now();
    const toks = (await env.DB.prepare("select token, pair, symbol, name, created, price, fdv, liq, buys_h1, sells_h1, ch_m5, ch_h1, ch_h24, vol_h24, image, passed, gate from tokens where price > 0 and liq >= 1000 and created > ? order by passed desc, vol_h24 desc limit 60").bind(now - 72 * H).all<Tok>()).results;
    const checks = (await env.DB.prepare("select * from checks order by id desc limit 30").all()).results;
    const stats = await env.DB.prepare("select (select count(*) from tokens) as pools, (select count(*) from tokens where liq >= 1000) as tracked, (select count(*) from calls) as calls, (select count(*) from tokens where price > 0 and liq >= 1000 and passed = 0) as blocked, (select count(*) from tokens where price > 0 and liq >= 1000 and passed = 1) as passed, (select count(*) from agents) as agents, (select max(t) from calls) as last_call").first();
    return json({ at: now, lastRun: Number(await meta(env, "lastRun")), stats, tokens: toks.map((t) => ({ ...t, gate: JSON.parse(t.gate || "[]") })), checks });
  }
  if (p === "/agents" && req.method === "GET") {
    const rows = (await env.DB.prepare("select slug, name, kind, spec, owner, created_at, fired_at, fire_reason, house from agents order by house desc, created_at desc limit 200").all<AgentRow & { owner: string; fire_reason: string; house: number }>()).results;
    const out = [];
    for (const a of rows) {
      const base = { ...a, spec: JSON.parse(a.spec) };
      if (a.kind === "trench") { const s = await agentStats(env, a.slug); out.push({ ...base, stats: { count: s.count, hit: s.hit, avg: s.avg, equity: s.equity, drawdown: Math.round(s.drawdown * 10) / 10, last: s.calls.slice(0, 3) } }); }
      else out.push(base);
    }
    return json({ agents: out });
  }
  const m = p.match(/^\/agents\/([a-z0-9-]+)$/);
  if (m && req.method === "GET") {
    const a = await env.DB.prepare("select slug, name, kind, spec, owner, created_at, fired_at, fire_reason, house from agents where slug = ?").bind(m[1]).first<AgentRow>();
    if (!a) return json({ error: "not found" }, 404);
    const base = { ...a, spec: JSON.parse(a.spec) };
    if (a.kind !== "trench") return json({ agent: base });
    const s = await agentStats(env, a.slug);
    const checks = (await env.DB.prepare("select * from checks where agent = ? order by id desc limit 30").bind(a.slug).all()).results;
    return json({ agent: base, stats: { count: s.count, hit: s.hit, avg: s.avg, equity: s.equity, drawdown: Math.round(s.drawdown * 10) / 10 }, calls: s.calls.slice(0, 60), checks });
  }
  if (p === "/agents" && req.method === "POST") {
    if (req.headers.get("x-hire-secret") !== env.SECRET) return json({ error: "forbidden" }, 403);
    const b = (await req.json().catch(() => null)) as { slug?: string; name?: string; kind?: string; spec?: unknown; owner?: string; ip?: string } | null;
    if (!b?.slug || !SLUG.test(b.slug) || !b.name || b.name.length > 32 || !["trench", "market"].includes(b.kind ?? "") || !b.spec) return json({ error: "bad input" }, 400);
    if (HOUSE.some((h) => h.slug === b.slug)) return json({ error: "taken" }, 409);
    const today = await env.DB.prepare("select count(*) as n from agents where ip = ? and created_at > ?").bind(b.ip ?? "", Date.now() - 24 * H).first<{ n: number }>();
    if ((today?.n ?? 0) >= 10) return json({ error: "10 agents a day per visitor" }, 429);
    const r = await env.DB.prepare("insert into agents (slug, name, kind, spec, owner, created_at, ip) values (?, ?, ?, ?, ?, ?, ?) on conflict(slug) do nothing").bind(b.slug, b.name, b.kind, JSON.stringify(b.spec), (b.owner ?? "anon").slice(0, 42), Date.now(), b.ip ?? "").run();
    if (!r.meta.changes) return json({ error: "taken" }, 409);
    const par = (b.spec as { parent?: string; version?: number }).parent; const ver = (b.spec as { version?: number }).version;
    if (par) await env.DB.prepare("update agents set fired_at=?, fire_reason=? where slug=? and fired_at is null").bind(Date.now(), `record frozen · v${ver} is live as @${b.slug}`, par).run();
    try { const v = await env.SNAP.get("agents"); if (v) { const snap = JSON.parse(v); const row = { slug: b.slug, name: b.name, kind: b.kind, spec: b.spec, owner: b.owner ?? "anon", created_at: Date.now(), fired_at: null, fire_reason: null, house: 0 }; snap.agents.push(row); snap.detail[b.slug] = { agent: row }; const par2 = (b.spec as { parent?: string }).parent; if (par2) for (const x of snap.agents) if (x.slug === par2 && !x.fired_at) { x.fired_at = Date.now(); x.fire_reason = `record frozen · new version @${b.slug}`; } await env.SNAP.put("agents", JSON.stringify(snap)); } } catch {}
    return json({ ok: true, slug: b.slug });
  }
  if (p === "/run" && req.headers.get("x-hire-secret") === env.SECRET) return json(await tick(env));
  if (p === "/probe" && req.headers.get("x-hire-secret") === env.SECRET) {
    const out: Record<string, string> = {};
    const tries: [string, string, RequestInit?][] = [
      ["blockscout", "https://robinhoodchain.blockscout.com/api?module=logs&action=getLogs&address=0x8366a39CC670B4001A1121B8F6A443A643e40951&topic0=" + INIT + "&fromBlock=116180000&toBlock=latest"],
      ["blockscout-v2", "https://robinhoodchain.blockscout.com/api/v2/addresses/0x8366a39CC670B4001A1121B8F6A443A643e40951/logs"],
      ["official", "https://rpc.mainnet.chain.robinhood.com", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }) }],
    ];
    for (const [k, u, init] of tries) { try { const r = await fetch(u, { ...(init ?? {}), headers: { "user-agent": "hire-api/1.0", ...((init?.headers as Record<string, string>) ?? {}) } }); out[k] = r.status + " " + (await r.text()).slice(0, 160); } catch (e) { out[k] = String(e); } }
    return json(out);
  }
  return json({ error: "not found" }, 404);
}

async function snapshot(env: Env) {
  const base = "https://snap.local";
  const floor = await handle(new Request(base + "/floor?fresh=1"), env).then((r) => r.text());
  const list = (await handle(new Request(base + "/agents?fresh=1"), env).then((r) => r.json())) as { agents: { slug: string }[] };
  const detail: Record<string, unknown> = {};
  for (const a of list.agents) detail[a.slug] = await handle(new Request(base + "/agents/" + a.slug + "?fresh=1"), env).then((r) => r.json());
  await env.SNAP.put("floor", floor);
  await env.SNAP.put("agents", JSON.stringify({ agents: list.agents, detail }));
}

async function tick(env: Env) {
  await seedHouse(env);
  await env.DB.prepare("delete from tokens where first_seen < ? and (liq is null or liq < 1000) and token not in (select token from calls)").bind(Date.now() - 96 * H).run();
  let d: unknown; try { d = await discover(env); } catch (e) { d = { error: String(e).slice(0, 400) }; }
  const r = await refresh(env);
  const a = await runAgents(env, r.toks, r.bigBySymbol);
  await setMeta(env, "lastRun", String(Date.now()));
  await snapshot(env);
  return { discover: d, tracked: r.tracked, priced: r.priced, agents: a };
}

export default {
  fetch: (req: Request, env: Env) => handle(req, env).catch((e) => json({ error: String(e) }, 500)),
  scheduled: async (_: ScheduledController, env: Env, ctx: ExecutionContext) => { ctx.waitUntil(tick(env)); },
};
