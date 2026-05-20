CREATE TABLE "payment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"m_payment_id" text NOT NULL,
	"pf_payment_id" text,
	"user_id" text,
	"payment_status" text NOT NULL,
	"amount_gross_cents" integer NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_events_dedup_uq" UNIQUE("m_payment_id","pf_payment_id")
);
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "listing_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "subscription_token" text;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;