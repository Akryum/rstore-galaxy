ALTER TABLE "celestial_profiles"
ALTER COLUMN "orbit_speed" SET DATA TYPE integer USING round("orbit_speed" * 100)::integer;
