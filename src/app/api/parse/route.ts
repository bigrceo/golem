import { NextResponse } from "next/server";
import { parse } from "@/lib/parse";
export async function POST(req: Request) {
  const { text } = await req.json().catch(() => ({ text: "" }));
  if (typeof text !== "string" || !text.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });
  return NextResponse.json(parse(text.slice(0, 400)));
}
