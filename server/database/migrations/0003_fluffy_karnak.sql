ALTER TABLE "celestial_profiles" ADD COLUMN "seed" integer;--> statement-breakpoint
UPDATE "celestial_profiles"
SET "seed" = "users"."seed"
FROM "users"
WHERE "celestial_profiles"."user_id" = "users"."id";--> statement-breakpoint
ALTER TABLE "celestial_profiles" ALTER COLUMN "seed" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "seed";
