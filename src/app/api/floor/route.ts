import { NextResponse } from "next/server";
import { getFloor } from "@/lib/api";
export const revalidate = 30;
export async function GET() { return NextResponse.json(await getFloor()); }
