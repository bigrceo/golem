/**
 * Storage: Postgres when DATABASE_URL is set (Neon / Railway), a JSON file otherwise (dev).
 */
import fs from "node:fs";
import path from "node:path";

export type Hire = { vault: string; owner: string; agentId: string; createdAt: number; live: boolean };
export type Event = {
  id?: number; vault: string; t: number; action: "BUY" | "SELL" | "HOLD" | "FIRED" | "GATE" | "ERROR";
  market: string; reason: string; tx?: string | null; equityUsd?: number | null;
};
export type Snapshot = { vault: string; t: number; equityUsd: number; peakUsd: number; ethUsd: number };

const FILE = path.join(process.cwd(), "data", "hire.json");
type Store = { hires: Hire[]; events: Event[]; snapshots: Snapshot[] };
function readFile(): Store {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return { hires: [], events: [], snapshots: [] }; }
}
function writeFile(s: Store) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(s)); }

const URL = process.env.DATABASE_URL;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sql: any = null;
async function pg() {
  if (sql) return sql;
  const postgres = (await import("postgres")).default;
  sql = postgres(URL!, { ssl: "require", max: 3 });
  await sql`create table if not exists hires (vault text primary key, owner text, agent_id text, created_at bigint, live boolean default true)`;
  await sql`create table if not exists events (id serial primary key, vault text, t bigint, action text, market text, reason text, tx text, equity_usd double precision)`;
  await sql`create table if not exists snapshots (vault text primary key, t bigint, equity_usd double precision, peak_usd double precision, eth_usd double precision)`;
  return sql;
}

export const db = {
  async upsertHire(h: Hire) {
    if (URL) { const s = await pg(); await s`insert into hires (vault, owner, agent_id, created_at, live) values (${h.vault}, ${h.owner}, ${h.agentId}, ${h.createdAt}, ${h.live}) on conflict (vault) do update set agent_id = excluded.agent_id, created_at = excluded.created_at, live = excluded.live`; return; }
    const st = readFile(); st.hires = st.hires.filter((x) => x.vault !== h.vault); st.hires.push(h); writeFile(st);
  },
  async hires(): Promise<Hire[]> {
    if (URL) { const s = await pg(); return (await s`select vault, owner, agent_id as "agentId", created_at as "createdAt", live from hires where live`).map((r: Hire) => ({ ...r, createdAt: Number(r.createdAt) })); }
    return readFile().hires.filter((h) => h.live);
  },
  async hireOf(vault: string): Promise<Hire | null> {
    const v = vault.toLowerCase();
    if (URL) { const s = await pg(); const r = await s`select vault, owner, agent_id as "agentId", created_at as "createdAt", live from hires where vault = ${v}`; return r[0] ? { ...r[0], createdAt: Number(r[0].createdAt) } : null; }
    return readFile().hires.find((h) => h.vault === v) ?? null;
  },
  async endHire(vault: string) {
    const v = vault.toLowerCase();
    if (URL) { const s = await pg(); await s`update hires set live = false where vault = ${v}`; return; }
    const st = readFile(); st.hires = st.hires.map((h) => (h.vault === v ? { ...h, live: false } : h)); writeFile(st);
  },
  async log(e: Event) {
    if (URL) { const s = await pg(); await s`insert into events (vault, t, action, market, reason, tx, equity_usd) values (${e.vault}, ${e.t}, ${e.action}, ${e.market}, ${e.reason}, ${e.tx ?? null}, ${e.equityUsd ?? null})`; return; }
    const st = readFile(); st.events.push({ ...e, id: st.events.length + 1 }); if (st.events.length > 5000) st.events = st.events.slice(-4000); writeFile(st);
  },
  async events(vault: string, limit = 60): Promise<Event[]> {
    const v = vault.toLowerCase();
    if (URL) { const s = await pg(); return (await s`select id, vault, t, action, market, reason, tx, equity_usd as "equityUsd" from events where vault = ${v} order by id desc limit ${limit}`).map((r: Event) => ({ ...r, t: Number(r.t) })); }
    return readFile().events.filter((e) => e.vault === v).slice(-limit).reverse();
  },
  async recentEvents(limit = 30): Promise<Event[]> {
    if (URL) { const s = await pg(); return (await s`select id, vault, t, action, market, reason, tx, equity_usd as "equityUsd" from events where action in ('BUY','SELL','FIRED') order by id desc limit ${limit}`).map((r: Event) => ({ ...r, t: Number(r.t) })); }
    return readFile().events.filter((e) => ["BUY", "SELL", "FIRED"].includes(e.action)).slice(-limit).reverse();
  },
  async snapshot(vault: string): Promise<Snapshot | null> {
    const v = vault.toLowerCase();
    if (URL) { const s = await pg(); const r = await s`select vault, t, equity_usd as "equityUsd", peak_usd as "peakUsd", eth_usd as "ethUsd" from snapshots where vault = ${v}`; return r[0] ? { ...r[0], t: Number(r[0].t) } : null; }
    return readFile().snapshots.find((x) => x.vault === v) ?? null;
  },
  async setSnapshot(x: Snapshot) {
    if (URL) { const s = await pg(); await s`insert into snapshots (vault, t, equity_usd, peak_usd, eth_usd) values (${x.vault}, ${x.t}, ${x.equityUsd}, ${x.peakUsd}, ${x.ethUsd}) on conflict (vault) do update set t = excluded.t, equity_usd = excluded.equity_usd, peak_usd = excluded.peak_usd, eth_usd = excluded.eth_usd`; return; }
    const st = readFile(); st.snapshots = st.snapshots.filter((s) => s.vault !== x.vault); st.snapshots.push(x); writeFile(st);
  },
};
