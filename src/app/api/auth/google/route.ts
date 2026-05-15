import { NextResponse } from "next/server";
import { getAuthUrl, isConnected } from "@/lib/google-auth";

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: "Google OAuth not configured" },
      { status: 500 }
    );
  }

  const url = getAuthUrl();
  return NextResponse.redirect(url);
}

export async function POST() {
  return NextResponse.json({ connected: isConnected() });
}
