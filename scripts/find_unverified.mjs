import { db } from "./app/lib/db.server";
import { users, accounts } from "./app/lib/schema";
import { eq, and } from "drizzle-orm";
import { readFileSync } from "fs";

// Load .env.local
const envContent = readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  process.env[key] = val;
}

async function main() {
  const unverified = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .innerJoin(accounts, eq(accounts.userId, users.id))
    .where(
      and(
        eq(accounts.providerId, "credential"),
        eq(users.emailVerified, false)
      )
    );

  console.log(JSON.stringify(unverified));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
