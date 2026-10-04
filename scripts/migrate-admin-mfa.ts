import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const sql = neon(process.env.DATABASE_URL);
  const migration = await readFile(new URL("../drizzle/0013_admin_two_factor.sql", import.meta.url), "utf8");
  // Apply only this additive migration; avoid replaying unrelated migrations.
  const statements = migration.split(";").map(value => value.trim()).filter(Boolean);
  await sql.transaction(statements.map(statement => sql.query(statement)));
  const [result] = await sql`SELECT to_regclass('public.admin_second_factors') AS factors, to_regclass('public.auth_rate_limits') AS limits`;
  if (!result.factors || !result.limits) throw new Error("Admin MFA tables were not created");
  console.info("Admin two-factor migration applied and verified.");
}

main().catch(() => {
  console.error("Admin two-factor migration failed. Production must remain paused until this is resolved.");
  process.exitCode = 1;
});
