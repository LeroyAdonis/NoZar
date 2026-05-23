import { type LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { users } from "~/lib/schema";
import { eq } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  return Response.json({ referralCode: dbUser?.referralCode });
}
