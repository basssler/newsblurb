import { NextRequest, NextResponse } from "next/server";
import { clearCache } from "@/lib/cache/kv";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log("[CACHE-CLEAR] Clearing all cache...");
    await clearCache();
    return NextResponse.json(
      { message: "Cache cleared successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[CACHE-CLEAR] Error:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500, headers: corsHeaders }
    );
  }
}
