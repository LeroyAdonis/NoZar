import { redirect, type LoaderFunctionArgs } from "react-router";
import { db } from "~/lib/db.server";
import { users } from "~/lib/schema";
import { eq } from "drizzle-orm";

export async function loader({ params }: LoaderFunctionArgs) {
  const { referralCode } = params;
  if (!referralCode) return redirect("/register");

  const user = await db.query.users.findFirst({
    where: eq(users.referralCode, referralCode),
  });

  if (!user) return redirect("/register");

  // Set cookie and redirect
  return redirect("/register", {
    headers: {
      "Set-Cookie": `referrerId=${user.id}; Path=/; HttpOnly; Max-Age=86400`,
    },
  });
}
