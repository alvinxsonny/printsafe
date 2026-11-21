ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "location" geometry(Point, 4326);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shops_location_gist" ON "shops" USING GIST ((location::geography));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION sync_shop_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_sync_shop_location ON "shops";
--> statement-breakpoint
CREATE TRIGGER trg_sync_shop_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON "shops"
FOR EACH ROW EXECUTE FUNCTION sync_shop_location();
