import { NextResponse } from "next/server";
import { apiGet } from "@/lib/api";
export const revalidate = 30;
export async function GET() { return NextResponse.json((await apiGet("/floor", 30)) ?? { tokens: [], checks: [], stats: null }); }
