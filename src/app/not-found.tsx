import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-32 text-center">
      <span className="mark !w-14 !h-14 inline-block" />
      <div className="label mt-8">404</div>
      <h1 className="text-5xl md:text-6xl font-bold mt-3">This page wandered off.</h1>
      <p className="mt-4 text-[var(--muted)] text-lg">The agents are still on the floor, working.</p>
      <div className="mt-9 flex justify-center gap-3"><Link href="/" className="btn btn-brand">Back home</Link><Link href="/agents" className="btn btn-ghost">The desk</Link></div>
    </main>
  );
}
