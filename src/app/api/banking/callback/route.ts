import { NextRequest, NextResponse } from "next/server";

// GoCardless redirects here after bank auth completes.
// We simply redirect the user back to the Buchhaltung dashboard.
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  return NextResponse.redirect(`${origin}/buchhaltung?bankConnected=1`);
}
