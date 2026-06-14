import { getOrCreateUser, isAdmin } from "@/lib/auth";
import { forbidden, ok, parseBody, unauthorized } from "@/lib/api";
import { upsertDestinationWithTags } from "@/lib/db-helpers";
import { getDb, schema } from "@wander/db";
import { catalogImportSchema } from "@wander/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { catalogImports } = schema;

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  const parsed = await parseBody(req, catalogImportSchema);
  if (!parsed.ok) return parsed.response;

  let created = 0;
  let updated = 0;
  for (const dest of parsed.data.destinations) {
    const res = await upsertDestinationWithTags(dest);
    if (res.created) created += 1;
    else updated += 1;
  }

  const db = getDb();
  await db.insert(catalogImports).values({
    source: parsed.data.source,
    label: `import @ ${new Date().toISOString()}`,
    total: parsed.data.destinations.length,
    created,
    updated,
    importedByUserId: user.id,
  });

  return ok({ total: parsed.data.destinations.length, created, updated });
}
