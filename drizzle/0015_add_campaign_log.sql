CREATE TABLE "campaign_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"campaign" text NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"recipient" text NOT NULL,
	"trade_id" integer,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_log" ADD CONSTRAINT "campaign_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_log_user_idx" ON "campaign_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "campaign_log_campaign_idx" ON "campaign_log" USING btree ("campaign");--> statement-breakpoint
CREATE INDEX "campaign_log_created_idx" ON "campaign_log" USING btree ("created_at");