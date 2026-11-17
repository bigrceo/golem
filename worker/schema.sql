create table if not exists agents (slug text primary key, name text not null, kind text not null, spec text not null, owner text, created_at integer not null, fired_at integer, fire_reason text, house integer default 0, ip text);
create table if not exists tokens (token text primary key, pair text, symbol text, name text, created integer, first_seen integer, last_seen integer, price real, fdv real, liq real, buys_h1 integer, sells_h1 integer, ch_m5 real, ch_h1 real, ch_h24 real, vol_h24 real, image text, passed integer, gate text);
create table if not exists calls (id integer primary key autoincrement, agent text not null, token text not null, symbol text, side text, entry_price real, entry_fdv real, t integer, reason text, closed_at integer, exit_price real, exit_reason text);
create table if not exists checks (id integer primary key autoincrement, agent text, token text, symbol text, t integer, passed integer, reason text);
create table if not exists meta (k text primary key, v text);
create index if not exists calls_agent on calls(agent);
create index if not exists calls_open on calls(closed_at);
create index if not exists tokens_seen on tokens(last_seen);
