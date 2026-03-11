CREATE TYPE "public"."body_type" AS ENUM('planet', 'asteroid', 'station', 'comet');--> statement-breakpoint
CREATE TYPE "public"."color_token" AS ENUM('cyber-cyan', 'plasma-blue', 'ion-indigo', 'quantum-violet', 'nova-pink', 'laser-red', 'solar-orange', 'reactor-amber', 'acid-lime', 'toxic-green', 'pulse-teal', 'frost-white');--> statement-breakpoint
CREATE TABLE "celestial_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"body_type" "body_type" NOT NULL,
	"orbit_distance" integer NOT NULL,
	"orbit_speed" numeric(4, 2) NOT NULL,
	"color_token" "color_token" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "celestial_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_id" text NOT NULL,
	"login" text NOT NULL,
	"name" text,
	"avatar_url" text NOT NULL,
	"bio" text,
	"location" text,
	"profile_url" text NOT NULL,
	"seed" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id"),
	CONSTRAINT "users_login_unique" UNIQUE("login")
);
--> statement-breakpoint
ALTER TABLE "celestial_profiles" ADD CONSTRAINT "celestial_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;