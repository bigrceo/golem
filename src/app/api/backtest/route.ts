import { NextResponse } from "next/server";
import { candles, isMarket } from "@/lib/candles";
import { run, describe, type Spec } from "@/lib/rules";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const spec = (await req.json().catch(() => null)) as Spec | null;
  if (!spec || !isMarket(spec.market)) return NextResponse.json({ error: "bad spec" }, { status: 400 });
  const c = await candles(spec.market);
  const r = run(c, spec, { keepDecisions: 12 });
  return NextResponse.json({ ...r, describe: describe(spec), candles: c.length });
}
