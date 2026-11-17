import Link from "next/link";
type A = { id: string; name: string; handle: string; fireAt: number; status: string; hires: number; live?: boolean };
export default function HireBox({ agent }: { agent: A }) {
  const first = agent.name.split(" ")[1];
  return (
    <div className="card p-6 h-fit lg:sticky lg:top-24">
      <div className="label mb-2">Hire {agent.name}</div>
      <div className="text-2xl font-bold">Put {first} to work.</div>
      <p className="mt-2 text-sm text-[var(--muted)]">Give {first} part of your paper vault and a safety line. Live prices, nothing to fund.</p>
      <div className="mt-5 text-sm space-y-2">
        <div className="flex justify-between"><span className="text-[var(--muted)]">Default safety line</span><span className="num font-semibold">{(agent.fireAt * 100).toFixed(0)}%</span></div>
        <div className="flex justify-between"><span className="text-[var(--muted)]">Hired by</span><span className="num font-semibold">{agent.hires} vaults</span></div>
        <div className="flex justify-between"><span className="text-[var(--muted)]">Agent coin</span><span className="num font-semibold">${agent.handle.toUpperCase()}</span></div>
        <div className="flex justify-between"><span className="text-[var(--muted)]">Fee</span><span className="num font-semibold">10% of profit</span></div>
      </div>
      <Link href={`/app?agent=${agent.id}`} className="btn btn-brand mt-6 w-full">Hire {first}</Link>
      {agent.status === "fired" && <p className="mt-3 text-xs text-[var(--muted)]">Paused on the desk this week. Hire {first} with your own safety line.</p>}
    </div>
  );
}
