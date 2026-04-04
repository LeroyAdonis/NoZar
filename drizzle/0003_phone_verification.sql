ALTER TABLE "profiles" ADD COLUMN "phone" text;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "phone_verified" boolean NOT NULL DEFAULT false;
