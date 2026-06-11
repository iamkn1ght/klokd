-- CreateTable
CREATE TABLE "delegated_authorities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "account_uuid" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "authority_jti" TEXT NOT NULL,
    "authority_jwt" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "ttl_seconds" INTEGER NOT NULL,
    "issued_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL,
    "revoked_at" DATETIME
);

-- CreateTable
CREATE TABLE "agent_briefings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "account_uuid" TEXT NOT NULL,
    "helpan_briefing_id" TEXT NOT NULL,
    "briefing_type" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "agent_actions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "account_uuid" TEXT NOT NULL,
    "helpan_action_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "delegated_authority_jti" TEXT NOT NULL,
    "target_rail" TEXT NOT NULL,
    "target_operation" TEXT NOT NULL,
    "business_op_id" TEXT NOT NULL,
    "traceparent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error_code" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "delegated_authorities_authority_jti_key" ON "delegated_authorities"("authority_jti");

-- CreateIndex
CREATE INDEX "delegated_authorities_account_uuid_idx" ON "delegated_authorities"("account_uuid");

-- CreateIndex
CREATE INDEX "delegated_authorities_agent_id_idx" ON "delegated_authorities"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_briefings_helpan_briefing_id_key" ON "agent_briefings"("helpan_briefing_id");

-- CreateIndex
CREATE INDEX "agent_briefings_account_uuid_idx" ON "agent_briefings"("account_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "agent_actions_helpan_action_id_key" ON "agent_actions"("helpan_action_id");

-- CreateIndex
CREATE INDEX "agent_actions_account_uuid_idx" ON "agent_actions"("account_uuid");

-- CreateIndex
CREATE INDEX "agent_actions_business_op_id_idx" ON "agent_actions"("business_op_id");

