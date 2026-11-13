import postgres from "postgres";

/**
 * db.ts — one shared database client per server instance.
 *
 * Uses Supabase's transaction pooler (port 6543), because on serverless
 * hosting every instance opening its own direct connections is how a
 * database runs out of them. prepare: false because that pooler does not
 * support prepared statements.
 *
 * Created on first use, not at import, so a missing setting fails inside a
 * route's safety net instead of crashing the whole module.
 */
let client: postgres.Sql | undefined;

export function db(): postgres.Sql {
  if (client === undefined) {
    const url = process.env.DATABASE_URL;
    if (url === undefined || url === "") throw new Error("DATABASE_URL is not set");
    client = postgres(url, { prepare: false, max: 1 });
  }
  return client;
}