import { NextRequest, NextResponse } from "next/server";
import { clearCache } from "@/lib/cache/kv";

export async function POST(request: NextRequest) {
  try {
    console.log("[CACHE-CLEAR] Clearing all cache...");
    await clearCache();
    return NextResponse.json(
      { message: "Cache cleared successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[CACHE-CLEAR] Error:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}
