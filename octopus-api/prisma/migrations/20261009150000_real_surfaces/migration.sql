-- AlterTable
ALTER TABLE "contracts" ADD COLUMN "body" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "read_at" DATETIME;
ALTER TABLE "notifications" ADD COLUMN "shift_id" TEXT;

-- AlterTable
ALTER TABLE "shift_settlements" ADD COLUMN "payment_id" TEXT;

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "data_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolved_by" TEXT,
    "resolved_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AlterTable
ALTER TABLE "shifts" ADD COLUMN "direct_offer" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens"("user_id");

-- CreateIndex
CREATE INDEX "data_requests_tenant_id_status_idx" ON "data_requests"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "step_up_challenge_id" TEXT;
