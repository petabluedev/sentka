-- Add username and lastLoginAt, backfill usernames for existing rows, then enforce NOT NULL + unique.
ALTER TABLE "User"
ADD COLUMN "username" TEXT,
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- Backfill usernames from email local part; fallback to hash if needed.
UPDATE "User"
SET "username" = regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9]+', '-', 'g')
WHERE "username" IS NULL;

UPDATE "User"
SET "username" = concat('user_', substr(md5("id"), 1, 8))
WHERE "username" IS NULL OR length(trim("username")) = 0;

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

-- Enforce uniqueness
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
