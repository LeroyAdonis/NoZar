ALTER TABLE "listings" ADD COLUMN "is_digital" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "phone_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meetup_votes" ADD CONSTRAINT "meetup_votes_trade_user_uq" UNIQUE("trade_id","user_id");--> statement-breakpoint
ALTER TABLE "readiness_flags" ADD CONSTRAINT "readiness_flags_trade_user_uq" UNIQUE("trade_id","user_id");