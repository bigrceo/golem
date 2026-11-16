import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  const [hire, events, snapshot] = await Promise.all([db.hireOf(addr), db.events(addr), db.snapshot(addr)]);
  return NextResponse.json({ hire, events, snapshot });
}
