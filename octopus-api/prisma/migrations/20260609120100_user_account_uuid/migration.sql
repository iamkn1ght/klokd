-- AlterTable: User gains account_uuid (Identiti FK, AD-K10) + kyc_tier cache.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "account_uuid" TEXT,
    "kyc_tier" INTEGER NOT NULL DEFAULT 0,
    "password_hash" TEXT,
    "role" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_users" ("created_at", "id", "is_active", "password_hash", "phone", "role", "tenant_id", "updated_at") SELECT "created_at", "id", "is_active", "password_hash", "phone", "role", "tenant_id", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE UNIQUE INDEX "users_account_uuid_key" ON "users"("account_uuid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
