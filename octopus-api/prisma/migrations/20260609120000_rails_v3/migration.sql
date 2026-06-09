-- AlterTable
ALTER TABLE "payments" ADD COLUMN "mpesa_ref" TEXT;
ALTER TABLE "payments" ADD COLUMN "payment_rail_ref" TEXT;

-- CreateTable
CREATE TABLE "notification_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "account_uuid" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "todoku_message_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "failure_reason" TEXT,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" DATETIME
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_employers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_uuid" TEXT,
    "wallet_id" TEXT,
    "kyc_tier" INTEGER NOT NULL DEFAULT 0,
    "business_name" TEXT NOT NULL,
    "kra_pin" TEXT,
    "contact_person" TEXT,
    "wiba_policy_ref" TEXT,
    "wiba_insurer" TEXT,
    "wiba_policy_expiry" DATETIME,
    "mpesa_method" TEXT,
    "mpesa_account_enc" TEXT,
    "rating_aggregate" REAL,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "total_shifts" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "employers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_employers" ("business_name", "contact_person", "created_at", "id", "kra_pin", "mpesa_account_enc", "mpesa_method", "rating_aggregate", "rating_count", "tenant_id", "total_shifts", "updated_at", "user_id", "wiba_insurer", "wiba_policy_expiry", "wiba_policy_ref") SELECT "business_name", "contact_person", "created_at", "id", "kra_pin", "mpesa_account_enc", "mpesa_method", "rating_aggregate", "rating_count", "tenant_id", "total_shifts", "updated_at", "user_id", "wiba_insurer", "wiba_policy_expiry", "wiba_policy_ref" FROM "employers";
DROP TABLE "employers";
ALTER TABLE "new_employers" RENAME TO "employers";
CREATE UNIQUE INDEX "employers_user_id_key" ON "employers"("user_id");
CREATE UNIQUE INDEX "employers_account_uuid_key" ON "employers"("account_uuid");
CREATE TABLE "new_workers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_uuid" TEXT,
    "wallet_id" TEXT,
    "kyc_tier" INTEGER NOT NULL DEFAULT 0,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "id_number_hash" TEXT,
    "id_front_key" TEXT,
    "id_back_key" TEXT,
    "selfie_key" TEXT,
    "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
    "skills" TEXT NOT NULL DEFAULT '[]',
    "certification_keys" TEXT NOT NULL DEFAULT '[]',
    "mpesa_number_enc" TEXT,
    "consent_identity" BOOLEAN NOT NULL DEFAULT false,
    "consent_gps" BOOLEAN NOT NULL DEFAULT false,
    "consented_at" DATETIME,
    "show_up_rate" REAL,
    "rating_aggregate" REAL,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "total_shifts" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_workers" ("certification_keys", "consent_gps", "consent_identity", "consented_at", "created_at", "first_name", "id", "id_back_key", "id_front_key", "id_number_hash", "last_name", "mpesa_number_enc", "rating_aggregate", "rating_count", "selfie_key", "show_up_rate", "skills", "tenant_id", "total_shifts", "updated_at", "user_id", "verification_status") SELECT "certification_keys", "consent_gps", "consent_identity", "consented_at", "created_at", "first_name", "id", "id_back_key", "id_front_key", "id_number_hash", "last_name", "mpesa_number_enc", "rating_aggregate", "rating_count", "selfie_key", "show_up_rate", "skills", "tenant_id", "total_shifts", "updated_at", "user_id", "verification_status" FROM "workers";
DROP TABLE "workers";
ALTER TABLE "new_workers" RENAME TO "workers";
CREATE UNIQUE INDEX "workers_user_id_key" ON "workers"("user_id");
CREATE UNIQUE INDEX "workers_account_uuid_key" ON "workers"("account_uuid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "notification_log_todoku_message_id_key" ON "notification_log"("todoku_message_id");

-- CreateIndex
CREATE INDEX "notification_log_account_uuid_idx" ON "notification_log"("account_uuid");

-- CreateIndex
CREATE INDEX "notification_log_template_id_idx" ON "notification_log"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_rail_ref_key" ON "payments"("payment_rail_ref");

