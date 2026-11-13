import { NextResponse } from "next/server";

/**
 * The database is out of reach. Reply with JSON a client can read, never an
 * empty 500, and log a fixed message: error details can contain personal data.
 */
export function unavailable(where: string) {
  console.error(`database unavailable during ${where}`);
  return NextResponse.json(
    { error: "The service is temporarily unavailable. Please try again in a few minutes." },
    { status: 503, headers: { "Retry-After": "120" } },
  );
}
