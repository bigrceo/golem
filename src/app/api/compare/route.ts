import { NextResponse } from "next/server";
import { candles, isMarket } from "@/lib/candles";
import { compare, type Spec } from "@/lib/rules";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const spec = (await req.json().catch(() => null)) as Spec | null;
  if (!spec || !isMarket(spec.market)) return NextResponse.json({ error: "bad spec" }, { status: 400 });
  return NextResponse.json({ rows: compare(await candles(spec.market), spec) });
}
