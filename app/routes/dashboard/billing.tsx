import { Form, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { subscriptions, listings } from "~/lib/schema";
import { eq, count } from "drizzle-orm";
export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  const [listingCount] = await db
    .select({ value: count() })
    .from(listings)
    .where(eq(listings.userId, user.id));

  return {
    sub: sub ?? { planCode: "free", status: "active" },
    listingCount: listingCount.value,
  };
}

export default function BillingPage() {
  const { sub, listingCount } = useLoaderData<typeof loader>();
  
  const limits = {
    free: 5,
    plus: 20,
    business: 100,
    enterprise: 99999,
  };

  const limit = limits[sub.planCode as keyof typeof limits] || 5;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Billing & Subscription</h1>
      
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Current Tier</span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
            sub.planCode === "free" ? "bg-gray-100 text-gray-700" : "bg-purple-100 text-purple-700"
          }`}>
            {sub.planCode}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Listings Usage</span>
            <span>{listingCount} / {limit}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div 
              className="bg-purple-600 h-2.5 rounded-full" 
              style={{ width: `${Math.min((listingCount / limit) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Upgrade Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {["plus", "business"].map((tier) => (
            <div key={tier} className="p-4 border rounded-lg hover:border-purple-500 transition-colors">
              <h3 className="font-bold capitalize">{tier}</h3>
              <p className="text-sm text-gray-500 mb-4">Features for power users</p>
              <Form action="/api/pay/upgrade" method="POST">
                <input type="hidden" name="planCode" value={tier} />
                <button 
                  type="submit" 
                  className="w-full bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800"
                >
                  Upgrade to {tier}
                </button>
              </Form>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-8 border-t">
        <a href="https://paystack.com" className="text-sm text-gray-500 hover:text-purple-600 underline">
          Manage Subscription on Paystack
        </a>
      </div>
    </div>
  );
}
