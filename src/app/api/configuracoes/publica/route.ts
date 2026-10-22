import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
  try {
    const prefs = await sql`SELECT pref_key, pref_value FROM user_preferences WHERE pref_key IN ('clinic_name','clinic_logo_base64')`;
    const config: Record<string, string> = {};
    prefs.forEach((p) => { config[p.pref_key] = p.pref_value; });

    return NextResponse.json({
      clinic_name: config.clinic_name || "MVP Psicologia",
      clinic_logo_base64: config.clinic_logo_base64 || null,
    });
  } catch {
    return NextResponse.json({ clinic_name: "MVP Psicologia", clinic_logo_base64: null });
  }
}
